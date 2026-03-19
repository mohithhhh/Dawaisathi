"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import ImageUpload from "@/components/ImageUpload";
import LanguageSelector from "@/components/LanguageSelector";
import ExplanationCard from "@/components/ExplanationCard";
import PaywallModal from "@/components/PaywallModal";
import UsageBar from "@/components/UsageBar";
import LandingPage from "@/components/LandingPage";
import type { Language, UserProfile } from "@/types";
import { FREE_TIER_LIMIT } from "@/types";
import ChatInterface from "@/components/ChatInterface";

// ─── App Tool ─────────────────────────────────────────────────────────────────
function AppTool() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const [activeTab, setActiveTab] = useState<"explain" | "chat">("explain");
  const [medicineName, setMedicineName] = useState("");
  const [language, setLanguage] = useState<Language>("hindi");
  const [imageBase64, setImageBase64] = useState("");
  const [imageMediaType, setImageMediaType] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  const [explanation, setExplanation] = useState("");
  const [extractedMedicine, setExtractedMedicine] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      setUser(data.user);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await fetchUserProfile();
      } catch { /* no supabase configured */ }
      setAuthLoading(false);
    };
    initAuth();

    let unsubscribe = () => {};
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: string) => {
          if (event === "SIGNED_IN") await fetchUserProfile();
          else if (event === "SIGNED_OUT") setUser(null);
        }
      );
      unsubscribe = () => subscription.unsubscribe();
    } catch { /* no supabase configured */ }

    return unsubscribe;
  }, [supabase.auth, fetchUserProfile]);

  useEffect(() => {
    if (searchParams.get("auth") === "required") setShowAuth(true);
  }, [searchParams]);

  const handleImageSelect = (base64: string, mediaType: string) => {
    setImageBase64(base64);
    setImageMediaType(mediaType);
    setMedicineName("");
    setImageLoading(true);
  };

  const handleImageClear = () => {
    setImageBase64("");
    setImageMediaType("");
    setImageLoading(false);
  };

  const checkPaywall = () => {
    if (!user) return false;
    const isPaid =
      user.plan === "paid" ||
      (user.plan === "subscription" &&
        user.subscription_end &&
        new Date(user.subscription_end) > new Date());
    return !isPaid && user.explanation_count >= FREE_TIER_LIMIT;
  };

  const handleSubmit = async () => {
    if (isStreaming || isLoading) return;
    if (!medicineName.trim() && !imageBase64) {
      setError("Please enter a medicine name or upload a photo");
      return;
    }
    if (checkPaywall()) { setShowPaywall(true); return; }

    setError("");
    setExplanation("");
    setExtractedMedicine("");
    setIsLoading(true);
    setIsStreaming(false);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_name: medicineName,
          language,
          image_base64: imageBase64 || undefined,
          image_media_type: imageMediaType || undefined,
        }),
      });

      if (res.status === 402) { setShowPaywall(true); setIsLoading(false); return; }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setError("Failed to read response"); setIsLoading(false); return; }

      setIsLoading(false);
      setIsStreaming(true);
      setImageLoading(false);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "medicine_name") {
              setExtractedMedicine(data.medicine_name);
              if (!medicineName && data.medicine_name) setMedicineName(data.medicine_name);
            } else if (data.type === "text") {
              setExplanation((prev) => prev + data.text);
            } else if (data.type === "done") {
              setIsStreaming(false);
              if (data.usage_count !== null) await fetchUserProfile();
            } else if (data.type === "error") {
              setError(data.error);
              setIsStreaming(false);
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    await fetchUserProfile();
    router.replace("/");
  };

  const handlePaymentSuccess = async () => {
    setShowPaywall(false);
    await fetchUserProfile();
    await handleSubmit();
  };

  const displayMedicine = extractedMedicine || medicineName;
  const hasResult = explanation.length > 0;
  const canSubmit = (medicineName.trim().length > 0 || imageBase64.length > 0) && !isLoading && !isStreaming;

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💊</span>
            <div>
              <p className="text-text-primary font-bold text-sm leading-tight">DawaiSathi</p>
              <p className="text-muted text-xs leading-tight">Medicine Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/history")}
                    className="text-muted hover:text-accent transition-colors text-sm px-2 py-1 rounded-lg hover:bg-surface-2"
                    title="History"
                  >📋</button>
                  <button
                    onClick={handleSignOut}
                    className="text-muted text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent/30 hover:text-text-primary transition-all"
                  >Sign out</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm font-medium px-3 py-1.5 rounded-full border border-accent/30 hover:border-accent transition-all"
                  style={{ color: "#fbe2a7" }}
                >Login</button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">

        {/* Tab bar */}
        <div className="flex rounded-xl border border-border overflow-hidden bg-surface">
          {(["explain", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-sm font-medium transition-all"
              style={
                activeTab === tab
                  ? { background: "rgba(251,226,167,0.12)", color: "#fbe2a7", borderBottom: "2px solid #fbe2a7" }
                  : { color: "#6b8a9a", borderBottom: "2px solid transparent" }
              }
            >
              {tab === "explain" ? "💊 Explain" : "💬 Chat"}
            </button>
          ))}
        </div>

        {user && !authLoading && activeTab === "explain" && (
          <UsageBar count={user.explanation_count} plan={user.plan} onUpgrade={() => setShowPaywall(true)} />
        )}

        {/* Chat tab */}
        {activeTab === "chat" && (
          <ChatInterface language={language} onLanguageChange={setLanguage} />
        )}

        {/* Explain tab content */}
        {activeTab === "explain" && <><div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Medicine Name
            </label>
            <input
              type="text"
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="e.g. Paracetamol, Metformin, Azithromycin..."
              disabled={isLoading || isStreaming}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors disabled:opacity-60"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted text-xs">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <ImageUpload
            onImageSelect={handleImageSelect}
            onClear={handleImageClear}
            hasImage={!!imageBase64}
            isLoading={imageLoading && (isLoading || isStreaming)}
          />

          <LanguageSelector selected={language} onChange={setLanguage} disabled={isLoading || isStreaming} />

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${isLoading ? "animate-pulse-slow" : ""}`}
            style={
              canSubmit
                ? {
                    background: "linear-gradient(135deg, #fbe2a7 0%, #f0d090 100%)",
                    color: "#0d1c24",
                    boxShadow: "0 0 20px rgba(251,226,167,0.25)",
                  }
                : { background: "#1a3040", color: "#6b8a9a", cursor: "not-allowed" }
            }
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Explain 💊"
            )}
          </button>

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-danger shrink-0">⚠</span>
              <div>
                <p className="text-danger text-sm">{error}</p>
                <button onClick={handleSubmit} className="text-danger/70 hover:text-danger text-xs mt-1 underline">
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        {(hasResult || isStreaming) && (
          <div className="bg-surface border border-border rounded-2xl p-4">
            <ExplanationCard
              medicineName={displayMedicine}
              explanation={explanation}
              language={language}
              isStreaming={isStreaming}
            />
          </div>
        )}

        {!user && !authLoading && (
          <div className="bg-surface border border-border rounded-2xl p-4 text-center">
            <p className="text-text-secondary text-sm">
              📱 Login to save history & track queries
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="mt-2 text-sm font-medium hover:underline"
              style={{ color: "#fbe2a7" }}
            >
              Login with phone number →
            </button>
          </div>
        )}</>}
      </main>

      <footer className="border-t border-border py-4 px-4 text-center">
        <p className="text-muted text-xs">
          ⚕ For information only — not medical advice. Always consult your doctor.
        </p>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} onSuccess={handlePaymentSuccess} user={user} />}
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────
function HomeContent() {
  const [showApp, setShowApp] = useState(false);

  if (showApp) return <AppTool />;
  return <LandingPage onEnter={() => setShowApp(true)} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
