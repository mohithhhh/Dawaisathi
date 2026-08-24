import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

const PRICES: Record<string, number> = {
  one_time: 2000,     // ₹20 in paise
  subscription: 9900, // ₹99 in paise
  pharmacist: 5000,   // ₹50 in paise
};

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
    }

    const { payment_type } = await request.json();

    if (!PRICES[payment_type]) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: PRICES[payment_type],
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { type: payment_type },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
