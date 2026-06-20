import { NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpay';

// POST { amount } amount in rupees -> creates a Razorpay order
export async function POST(req) {
  const { amount } = await req.json();
  const razorpay = getRazorpay();
  if (!razorpay) {
    return NextResponse.json(
      { error: 'Payment gateway is not configured. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in .env' },
      { status: 500 }
    );
  }
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`
  });
  return NextResponse.json({ order, keyId: process.env.RAZORPAY_KEY_ID });
}
