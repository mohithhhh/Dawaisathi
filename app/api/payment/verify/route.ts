import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_type,
      callback_data,
    }: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      payment_type: "one_time" | "subscription" | "pharmacist";
      callback_data?: {
        medicine_name: string;
        language: string;
        explanation: string;
        phone?: string;
      };
    } = body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
    }

    // 1. Verify Razorpay HMAC signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 2. Create Supabase client with user's cookie session
    const response = NextResponse.json({ success: true });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Atomically claim this order BEFORE applying any plan/subscription
    // change. razorpay_order_id is `unique not null` on payments — so if this
    // order was already processed (a replayed callback, a double-submitted
    // request, a network retry that the client re-fires), this insert fails
    // with a unique-violation and we return success without re-applying the
    // effect. Previously the user-plan UPDATE ran first and the payment
    // INSERT's result was never checked, so a replayed valid signature could
    // silently re-extend subscription_end by another 30 days indefinitely.
    const amounts: Record<string, number> = { one_time: 2000, subscription: 9900, pharmacist: 5000 };
    const { error: insertErr } = await supabase.from("payments").insert({
      user_id: user.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: amounts[payment_type] ?? 0,
      payment_type,
      status: "completed",
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        // unique_violation on razorpay_order_id — already processed. Idempotent no-op.
        return response;
      }
      console.error("Payment insert failed:", insertErr);
      Sentry.captureException(insertErr, { extra: { razorpay_order_id, payment_type } });
      return NextResponse.json({ error: "Payment recording failed. Contact support." }, { status: 500 });
    }

    // 4. Order claimed — now apply the plan change.
    if (payment_type === "subscription") {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: planErr } = await supabase
        .from("users")
        .update({ plan: "subscription", subscription_end: expiresAt })
        .eq("id", user.id);
      if (planErr) {
        console.error("Subscription plan update failed:", planErr);
        Sentry.captureException(planErr, { extra: { razorpay_order_id, payment_type, user_id: user.id } });
      }
    } else if (payment_type === "one_time") {
      const { error: planErr } = await supabase
        .from("users")
        .update({ plan: "paid" })
        .eq("id", user.id);
      if (planErr) {
        console.error("One-time plan update failed:", planErr);
        Sentry.captureException(planErr, { extra: { razorpay_order_id, payment_type, user_id: user.id } });
      }
    }

    // 5. For pharmacist payment: create callback request
    if (payment_type === "pharmacist" && callback_data) {
      const { error: cbErr } = await supabase.from("callback_requests").insert({
        patient_id: user.id,
        patient_phone: callback_data.phone || user.phone || null,
        medicine_name: callback_data.medicine_name,
        language: callback_data.language,
        explanation: callback_data.explanation,
      });
      if (cbErr) {
        // Non-fatal: the payment is already recorded — don't fail the response,
        // but this needs a human to notice and follow up manually.
        console.error("Callback request creation failed:", cbErr);
        Sentry.captureException(cbErr, { extra: { razorpay_order_id, user_id: user.id } });
      }
    }

    return response;
  } catch (error) {
    console.error("Payment verify error:", error);
    Sentry.captureException(error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
