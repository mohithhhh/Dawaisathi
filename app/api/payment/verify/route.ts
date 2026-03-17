import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_type,
    } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      payment_type: "one_time" | "subscription";
    };

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Update payment record
    const { error: paymentError } = await supabase
      .from("payments")
      .update({
        razorpay_payment_id,
        status: "completed",
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", session.user.id);

    if (paymentError) {
      console.error("Payment update error:", paymentError);
      return NextResponse.json(
        { error: "Failed to update payment record" },
        { status: 500 }
      );
    }

    // Update user plan
    let planUpdate: Record<string, unknown> = {};

    if (payment_type === "one_time") {
      planUpdate = { plan: "paid" };
    } else if (payment_type === "subscription") {
      const subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      planUpdate = {
        plan: "subscription",
        subscription_end: subscriptionEnd.toISOString(),
      };
    }

    const { error: userError } = await supabase
      .from("users")
      .update(planUpdate)
      .eq("id", session.user.id);

    if (userError) {
      console.error("User plan update error:", userError);
      return NextResponse.json(
        { error: "Payment verified but failed to update plan" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: payment_type === "one_time" ? "paid" : "subscription",
      message:
        payment_type === "one_time"
          ? "One-time consultation unlocked!"
          : "Monthly subscription activated!",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
