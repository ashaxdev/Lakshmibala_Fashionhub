import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { dbConnect } from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Combo from '@/models/Combo';
import Coupon from '@/models/Coupon';
import Settings from '@/models/Settings';
import { genOrderNumber, genCouponCheck } from '@/lib/utils';
import { requireAdmin } from '@/lib/apiAuth';

// Atomically decrement stock for a single (product, variant, size), only if
// enough stock is currently available. Returns true on success.
async function tryDecrementStock(productId, variantId, size, qty) {
  const updated = await Product.findOneAndUpdate(
    {
      _id: productId,
      'variants._id': variantId,
      'variants.sizes.size': size,
      'variants.sizes.stock': { $gte: qty }
    },
    { $inc: { 'variants.$[v].sizes.$[s].stock': -qty, soldCount: qty } },
    { arrayFilters: [{ 'v._id': variantId }, { 's.size': size }] }
  );
  return !!updated;
}

async function restoreStock(productId, variantId, size, qty) {
  await Product.updateOne(
    { _id: productId, 'variants._id': variantId, 'variants.sizes.size': size },
    { $inc: { 'variants.$[v].sizes.$[s].stock': qty, soldCount: -qty } },
    { arrayFilters: [{ 'v._id': variantId }, { 's.size': size }] }
  );
}

export async function POST(req) {
  // Tracks every successful decrement so we can roll back if anything later fails.
  const decremented = [];

  try {
    await dbConnect();
    const body = await req.json();
    const {
      items, customer, shippingAddress, couponCode, paymentMethod,
      razorpayOrderId, razorpayPaymentId, razorpaySignature
    } = body;

    if (!items?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    if (!customer?.name || !customer?.phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    // --- Verify the payment is real BEFORE doing anything else ---
    if (paymentMethod === 'razorpay') {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json({ error: 'Missing payment verification data' }, { status: 400 });
      }
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      if (expected !== razorpaySignature) {
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
      }
    }

    let subtotal = 0;
    const orderItems = [];

    // --- Pass 1: validate items, build order line items, and atomically
    // reserve stock as we go. Any failure here rolls back everything
    // already decremented in this loop. ---
    for (const item of items) {
      if (item.isCombo === true && item.comboId) {
        if (!mongoose.Types.ObjectId.isValid(item.comboId)) continue;

        const combo = await Combo.findById(item.comboId);
        if (!combo || !combo.isActive) {
          await rollback(decremented);
          return NextResponse.json({ error: 'This combo is no longer available' }, { status: 400 });
        }

        // Reserve stock for every product inside the combo. If any sub-item
        // fails, undo every reservation made so far (including earlier
        // sub-items of this same combo) and bail.
        for (const sub of combo.products) {
          const ok = await tryDecrementStock(sub.product, sub.variantId, sub.size, item.qty);
          if (!ok) {
            await rollback(decremented);
            return NextResponse.json(
              { error: `Combo "${combo.name}" is out of stock` },
              { status: 409 }
            );
          }
          decremented.push({ productId: sub.product, variantId: sub.variantId, size: sub.size, qty: item.qty });
        }

        subtotal += combo.comboPrice * item.qty;
        orderItems.push({
          product: null,
          comboId: combo._id,
          name: combo.name,
          image: combo.image || '',
          color: '',
          size: '',
          price: combo.comboPrice,
          qty: item.qty,
          isCombo: true
        });
        continue;
      }

      if (!mongoose.Types.ObjectId.isValid(item.productId) || !mongoose.Types.ObjectId.isValid(item.variantId)) {
        continue;
      }

      const product = await Product.findById(item.productId);
      if (!product) continue;
      const variant = product.variants.id(item.variantId);
      if (!variant) continue;
      const sizeEntry = variant.sizes.find((s) => s.size === item.size);
      if (!sizeEntry) continue;

      const ok = await tryDecrementStock(item.productId, item.variantId, item.size, item.qty);
      if (!ok) {
        await rollback(decremented);
        return NextResponse.json(
          { error: `${product.name} (${variant.color}, ${item.size}) is out of stock` },
          { status: 409 }
        );
      }
      decremented.push({ productId: item.productId, variantId: item.variantId, size: item.size, qty: item.qty });

      subtotal += variant.price * item.qty;
      orderItems.push({
        product: product._id,
        name: product.name,
        image: variant.images?.[0] || '',
        color: variant.color,
        size: item.size,
        price: variant.price,
        qty: item.qty
      });
    }

    if (!orderItems.length) {
      await rollback(decremented);
      return NextResponse.json({ error: 'No valid items in cart' }, { status: 400 });
    }

    let discount = 0;
    let appliedCoupon = '';
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: genCouponCheck(couponCode), isActive: true });
      if (coupon && subtotal >= (coupon.minOrderValue || 0)) {
        if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
          if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
            discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
            if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
            appliedCoupon = coupon.code;
            coupon.usedCount += 1;
            await coupon.save();
          }
        }
      }
    }

    const settings = (await Settings.findOne({ key: 'global' })) || { shippingFee: 49, freeShippingAbove: 999 };
    const shippingFee = subtotal - discount >= settings.freeShippingAbove ? 0 : settings.shippingFee;
    const total = Math.round(subtotal - discount + shippingFee);

    // Stock is already safely reserved at this point — only now do we
    // create the order record.
    let order;
    try {
      order = await Order.create({
        orderNumber: genOrderNumber(),
        items: orderItems,
        customer,
        shippingAddress,
        subtotal,
        discount,
        couponCode: appliedCoupon,
        shippingFee,
        total,
        paymentMethod: paymentMethod || 'cod',
        paymentStatus: paymentMethod === 'razorpay' ? 'paid' : 'pending',
        razorpayOrderId,
        razorpayPaymentId
      });
    } catch (orderErr) {
      // Order failed to save after stock was already reserved — give the stock back.
      await rollback(decremented);
      throw orderErr;
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error('Order creation failed:', err);
    // Critical: if payment already succeeded, this is money-with-no-order.
    // Log enough to find it: razorpayPaymentId is in `body` above if you want to capture it here too.
    return NextResponse.json(
      { error: 'Could not create order. If you were charged, contact support with your payment ID.' },
      { status: 500 }
    );
  }
}

async function rollback(decremented) {
  for (const d of decremented) {
    await restoreStock(d.productId, d.variantId, d.size, d.qty);
  }
}

export const GET = requireAdmin(async (req) => {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } }
    ];
  }
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 20);
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(query)
  ]);
  return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) });
});