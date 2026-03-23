"use client";

import { useState } from "react";
import type { UserProfile } from "@/types";

interface PaywallModalProps {
  onClose: () => void;
  onSuccess: () => void;
  user: UserProfile | null;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { contact?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

export default function PaywallModal({
  onClose,
  onSuccess,
  user,
}: PaywallModalProps) {
  const [loading, setLoading] = useState<"one_time" | "subscription" | null>(
    null
  );
  const [error, setError] = useState("");

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handlePayment = async (
    payment_type: "one_time" | "subscription"
  ) => {
    setError("");
    setLoading(payment_type);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        setError("Payment gateway failed to load. Please check your internet connection.");
        setLoading(null);
        return;
      }

      // Create order
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_type }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        setError(data.error || "Failed to create payment order");
        setLoading(null);
        return;
      }

      const orderData = await orderRes.json();

      const options: RazorpayOptions = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: "INR",
        name: "DawaiSathi",
        description:
          payment_type === "one_time"
            ? "One-time Medicine Consultation"
            : "Monthly Unlimited Plan",
        order_id: orderData.order_id,
        prefill: {
          contact: user?.phone,
        },
        theme: {
          color: "#4ade80",
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                payment_type,
              }),
            });

            if (verifyRes.ok) {
              setLoading(null);
              onSuccess();
            } else {
              const data = await verifyRes.json();
              setError(data.error || "Payment verification failed");
              setLoading(null);
            }
          } catch {
            setError("Payment verification failed. Contact support.");
            setLoading(null);
          }
        },
        modal: {
          ondismiss: () => setLoading(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-text-primary font-semibold text-lg">
              मुफ्त सीमा समाप्त
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              3 free explanations used. Choose a plan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2"
          >
            ✕
          </button>
        </div>

        {/* Plans */}
        <div className="space-y-3">
          {/* One-time plan */}
          <button
            onClick={() => handlePayment("one_time")}
            disabled={!!loading}
            className="w-full bg-surface-2 border border-border hover:border-accent/50 rounded-xl p-4 text-left transition-all group disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  <span className="text-text-primary font-semibold">
                    Single Consultation
                  </span>
                </div>
                <p className="text-text-secondary text-sm mt-1 ml-7">
                  One medicine explanation
                </p>
              </div>
              <div className="text-right">
                <p className="text-accent font-bold text-xl">₹20</p>
                <p className="text-muted text-xs">one-time</p>
              </div>
            </div>
            {loading === "one_time" && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-muted text-xs">Opening payment...</span>
              </div>
            )}
          </button>

          {/* Subscription plan */}
          <button
            onClick={() => handlePayment("subscription")}
            disabled={!!loading}
            className="w-full bg-accent-glow border border-accent/30 hover:border-accent rounded-xl p-4 text-left transition-all relative overflow-hidden disabled:opacity-60"
          >
            <div className="absolute top-2 right-2 bg-accent text-background text-xs font-bold px-2 py-0.5 rounded-full">
              BEST VALUE
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4zm0 0c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/></svg>
                  <span className="text-text-primary font-semibold">
                    Monthly Unlimited
                  </span>
                </div>
                <p className="text-text-secondary text-sm mt-1 ml-7">
                  Unlimited explanations for 30 days
                </p>
              </div>
              <div className="text-right">
                <p className="text-accent font-bold text-xl">₹99</p>
                <p className="text-muted text-xs">per month</p>
              </div>
            </div>
            {loading === "subscription" && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-accent/20">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-muted text-xs">Opening payment...</span>
              </div>
            )}
          </button>
        </div>

        {error && (
          <p className="text-danger text-sm bg-danger/10 rounded-lg px-3 py-2 mt-3">
            ⚠ {error}
          </p>
        )}

        <p className="text-muted text-xs text-center mt-4">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Secure payment via Razorpay • UPI, Cards, Net Banking accepted
        </p>
      </div>
    </div>
  );
}
