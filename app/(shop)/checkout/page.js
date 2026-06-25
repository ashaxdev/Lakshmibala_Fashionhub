'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import toast from 'react-hot-toast';
import { useCart } from '@/components/CartContext';
import { formatINR } from '@/lib/utils';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    line1: '', line2: '', city: '', state: '', pincode: '', landmark: ''
  });
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [submitting, setSubmitting] = useState(false);

  const shipping = subtotal - discount >= 999 ? 0 : 49;
  const total = Math.round(subtotal - discount + shipping);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: coupon, subtotal })
    });
    const data = await res.json();
    if (data.valid) {
      setDiscount(data.discount);
      toast.success(data.message);
    } else {
      setDiscount(0);
      toast.error(data.message);
    }
  }

  async function placeOrder() {
    if (!form.name || !form.phone || !form.line1 || !form.city || !form.pincode) {
      toast.error('Please fill all required fields');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    setSubmitting(true);

    const orderItems = items.map((i) => ({
      productId: i.productId, variantId: i.variantId, size: i.size, qty: i.qty
    }));

    try {
      if (paymentMethod === 'razorpay') {
        const orderRes = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total })
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          toast.error(orderData.error || 'Payment gateway error');
          setSubmitting(false);
          return;
        }

        const rzp = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.order.amount,
          currency: 'INR',
          name: 'Lakshmibala Clothing Store',
          order_id: orderData.order.id,
          prefill: { name: form.name, contact: form.phone, email: form.email },
          theme: { color: '#C2185B' },
          handler: async function (response) {
            const finalRes = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: orderItems,
                customer: { name: form.name, phone: form.phone, email: form.email },
                shippingAddress: form,
                couponCode: coupon,
                paymentMethod: 'razorpay',
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const finalData = await finalRes.json();
            if (finalRes.ok) {
              clearCart();
              router.push(`/order-success/${finalData.order._id}`);
            } else {
              toast.error(finalData.error || 'Could not save order');
            }
            setSubmitting(false);
          },
          modal: { ondismiss: () => setSubmitting(false) }
        });
        rzp.open();
      } else {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: orderItems,
            customer: { name: form.name, phone: form.phone, email: form.email },
            shippingAddress: form,
            couponCode: coupon,
            paymentMethod: 'cod'
          })
        });
        const data = await res.json();
        if (res.ok) {
          clearCart();
          router.push(`/order-success/${data.order._id}`);
        } else {
          toast.error(data.error || 'Could not place order');
        }
        setSubmitting(false);
      }
    } catch (e) {
      toast.error('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <h1 className="font-display text-2xl font-bold text-brand-magenta mb-6">Checkout</h1>

      <div className="grid sm:grid-cols-2 gap-8">
        <div className="card-soft p-5 space-y-3">
          <h2 className="font-semibold text-brand-ink mb-1">Shipping Details</h2>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Full Name *" value={form.name} onChange={(e) => update('name', e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phone Number *" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Email (optional)" value={form.email} onChange={(e) => update('email', e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Address Line 1 *" value={form.line1} onChange={(e) => update('line1', e.target.value)} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Address Line 2" value={form.line2} onChange={(e) => update('line2', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="City *" value={form.city} onChange={(e) => update('city', e.target.value)} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="State" value={form.state} onChange={(e) => update('state', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Pincode *" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Landmark" value={form.landmark} onChange={(e) => update('landmark', e.target.value)} />
          </div>
        </div>

        <div>
          <div className="card-soft p-5">
            <h2 className="font-semibold text-brand-ink mb-3">Order Summary</h2>
            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1 text-brand-ink/70">
                <span>{i.name} ({i.color}/{i.size}) x{i.qty}</span>
                <span>{formatINR(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-3">
              <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
              <button onClick={applyCoupon} className="btn-outline px-4 text-sm">Apply</button>
            </div>
            <hr className="my-3" />
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm text-brand-green"><span>Discount</span><span>-{formatINR(discount)}</span></div>}
            <div className="flex justify-between text-sm"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatINR(shipping)}</span></div>
            <div className="flex justify-between font-bold text-lg mt-2"><span>Total</span><span className="text-brand-magenta">{formatINR(total)}</span></div>
          </div>

          <div className="card-soft p-5 mt-4">
            <h2 className="font-semibold text-brand-ink mb-2">Payment Method</h2>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="radio" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} /> Pay Online (Cards/UPI/Netbanking)
            </label>
            {/* <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} /> Cash on Delivery
            </label> */}
          </div>

          <button onClick={placeOrder} disabled={submitting} className="btn-primary w-full mt-4">
            {submitting ? 'Placing Order...' : `Place Order - ${formatINR(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
