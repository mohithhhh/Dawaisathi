import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

    // 3. Update user plan based on payment type
    if (payment_type === "subscription") {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("users")
        .update({ plan: "subscription", subscription_end: expiresAt })
        .eq("id", user.id);
    } else if (payment_type === "one_time") {
      await supabase
        .from("users")
        .update({ plan: "paid" })
        .eq("id", user.id);
    }

    // 4. For pharmacist payment: create callback request
    if (payment_type === "pharmacist" && callback_data) {
      try {
        await supabase.from("callback_requests").insert({
          patient_id: user.id,
          patient_phone: callback_data.phone || user.phone || null,
          medicine_name: callback_data.medicine_name,
          language: callback_data.language,
          explanation: callback_data.explanation,
        });
      } catch (cbErr) {
        // Non-fatal: log but don't fail the payment
        console.error("Callback request creation failed:", cbErr);
      }
    }

    // 5. Log payment record
    const amounts: Record<string, number> = { one_time: 2000, subscription: 9900, pharmacist: 5000 };
    await supabase.from("payments").insert({
      user_id: user.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: amounts[payment_type] ?? 0,
      payment_type,
      status: "completed",
    });

    return response;
  } catch (error) {
    console.error("Payment verify error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
