"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  const formatPhone = (value: string) => {
    // Strip non-digits
    const digits = value.replace(/\D/g, "");
    // Add +91 prefix if not present
    if (digits.startsWith("91") && digits.length > 10) {
      return `+${digits}`;
    }
    return digits.length <= 10 ? digits : digits.slice(-10);
  };

  const getFullPhone = () => {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
  };

  const handleSendOTP = async () => {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: getFullPhone(),
      });

      if (error) {
        setError(error.message);
      } else {
        setStep("otp");
      }
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");
    if (otp.length < 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: getFullPhone(),
        token: otp,
        type: "sms",
      });

      if (error) {
        setError(error.message);
      } else {
        // Create user profile if needed
        await fetch("/api/user/profile");
        onSuccess();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-text-primary font-semibold text-lg">
              {step === "phone" ? "अपना नंबर डालें" : "OTP दर्ज करें"}
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {step === "phone"
                ? "Login with your mobile number"
                : `OTP sent to +91 ${phone}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2"
          >
            ✕
          </button>
        </div>

        {/* Phone step */}
        {step === "phone" && (
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-medium">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="9876543210"
                maxLength={10}
                className="w-full bg-surface-2 border border-border rounded-xl pl-12 pr-4 py-3 text-text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors text-lg tracking-wider"
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-danger text-sm bg-danger/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleSendOTP}
              disabled={loading || phone.length < 10}
              className="w-full bg-accent text-background font-semibold py-3 rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Sending..." : "Send OTP →"}
            </button>
          </div>
        )}

        {/* OTP step */}
        {step === "otp" && (
          <div className="space-y-4">
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              placeholder="------"
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors text-2xl tracking-[0.5em] text-center"
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
              autoFocus
            />

            {error && (
              <p className="text-danger text-sm bg-danger/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length < 6}
              className="w-full bg-accent text-background font-semibold py-3 rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Verifying..." : "Verify OTP ✓"}
            </button>

            <button
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError("");
              }}
              className="w-full text-text-secondary text-sm hover:text-text-primary transition-colors py-2"
            >
              ← Change number
            </button>
          </div>
        )}

        <p className="text-muted text-xs text-center mt-4">
          By continuing, you agree to receive SMS for OTP verification
        </p>
      </div>
    </div>
  );
}
