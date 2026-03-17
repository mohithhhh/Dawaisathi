import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ONE_TIME_PRICE, SUBSCRIPTION_PRICE } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { payment_type } = body as { payment_type: "one_time" | "subscription" };

    if (!payment_type || !["one_time", "subscription"].includes(payment_type)) {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const amount = payment_type === "one_time" ? ONE_TIME_PRICE : SUBSCRIPTION_PRICE;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `dawaisathi_${session.user.id}_${Date.now()}`,
      notes: {
        user_id: session.user.id,
        payment_type,
      },
    });

    // Save pending payment record
    await supabase.from("payments").insert({
      user_id: session.user.id,
      razorpay_order_id: order.id,
      amount,
      payment_type,
      status: "pending",
    });

    return NextResponse.json({
      order_id: order.id,
      amount,
      currency: "INR",
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      payment_type,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
