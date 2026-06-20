import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Combo from '@/models/Combo';
import Coupon from '@/models/Coupon';
import Settings from '@/models/Settings';
import { genOrderNumber, genCouponCheck } from '@/lib/utils';
import { requireAdmin } from '@/lib/apiAuth';

// POST /api/orders -> create a new order (called after payment success, or for COD)
export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const { items, customer, shippingAddress, couponCode, paymentMethod, razorpayOrderId, razorpayPaymentId } = body;

  if (!items?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  if (!customer?.name || !customer?.phone) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
  }

  let subtotal = 0;
  const orderItems = [];
  // Mirrors orderItems exactly, so the inventory-deduction loop below
  // only ever touches what was actually accepted into the order.
  const stockUpdateItems = [];

  for (const item of items) {
    // ---- Combo cart item ----
    if (item.isCombo === true && item.comboId) {
      if (!mongoose.Types.ObjectId.isValid(item.comboId)) continue;

      const combo = await Combo.findById(item.comboId);
      if (!combo || !combo.isActive) {
        return NextResponse.json({ error: 'This combo is no longer available' }, { status: 400 });
      }

      // Validate stock for every product bundled inside the combo
      for (const sub of combo.products) {
        const subProduct = await Product.findById(sub.product);
        const subVariant = subProduct?.variants.id(sub.variantId);
        const subSizeEntry = subVariant?.sizes.find((s) => s.size === sub.size);
        if (!subProduct || !subVariant || !subSizeEntry || subSizeEntry.stock < item.qty) {
          return NextResponse.json(
            { error: `Combo "${combo.name}" is out of stock` },
            { status: 400 }
          );
        }
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
      stockUpdateItems.push({ isCombo: true, comboProducts: combo.products, qty: item.qty });
      continue;
    }

    // ---- Regular product cart item ----
    if (!mongoose.Types.ObjectId.isValid(item.productId) || !mongoose.Types.ObjectId.isValid(item.variantId)) {
      continue; // skip malformed cart entries instead of crashing
    }

    const product = await Product.findById(item.productId);
    if (!product) continue;
    const variant = product.variants.id(item.variantId);
    if (!variant) continue;
    const sizeEntry = variant.sizes.find((s) => s.size === item.size);
    if (!sizeEntry || sizeEntry.stock < item.qty) {
      return NextResponse.json(
        { error: `${product.name} (${variant.color}, ${item.size}) is out of stock` },
        { status: 400 }
      );
    }
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
    stockUpdateItems.push({
      isCombo: false,
      productId: item.productId,
      variantId: item.variantId,
      size: item.size,
      qty: item.qty
    });
  }

  if (!orderItems.length) return NextResponse.json({ error: 'No valid items in cart' }, { status: 400 });

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

  const order = await Order.create({
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

  // deduct inventory + bump soldCount — only for items actually accepted above
  for (const entry of stockUpdateItems) {
    if (entry.isCombo) {
      for (const sub of entry.comboProducts) {
        await Product.updateOne(
          { _id: sub.product, 'variants._id': sub.variantId, 'variants.sizes.size': sub.size },
          { $inc: { 'variants.$[v].sizes.$[s].stock': -entry.qty, soldCount: entry.qty } },
          { arrayFilters: [{ 'v._id': sub.variantId }, { 's.size': sub.size }] }
        );
      }
      continue;
    }

    await Product.updateOne(
      { _id: entry.productId, 'variants._id': entry.variantId, 'variants.sizes.size': entry.size },
      { $inc: { 'variants.$[v].sizes.$[s].stock': -entry.qty, soldCount: entry.qty } },
      { arrayFilters: [{ 'v._id': entry.variantId }, { 's.size': entry.size }] }
    );
  }

  return NextResponse.json({ order }, { status: 201 });
}

// GET /api/orders -> admin: list all orders with filters
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