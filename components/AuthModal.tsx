"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const supabase = createClient();
  const [phone, setPhone] = useState("");

  const handleGoogleSignIn = async () => {
    if (!phone.trim()) return;
    localStorage.setItem("pendingPhone", "+91" + phone.trim());
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const isValid = phone.trim().length === 10;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-text-primary font-semibold text-lg">Sign in</h2>
            <p className="text-text-secondary text-sm mt-1">Save your medicine history</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-text-secondary text-sm mb-1.5">
            Mobile number <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2.5">
            <span className="text-text-secondary text-sm select-none">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-muted"
            />
          </div>
          <p className="text-muted text-xs mt-1">Required for pharmacist callbacks</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={!isValid}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        <p className="text-muted text-xs text-center mt-4">
          By continuing, you agree to our{" "}
          <a href="/terms" className="underline">terms of service</a>
        </p>
      </div>
    </div>
  );
}
