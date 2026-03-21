"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import ImageUpload from "@/components/ImageUpload";
import LanguageSelector from "@/components/LanguageSelector";
import ChatInterface from "@/components/ChatInterface";
import PaywallModal from "@/components/PaywallModal";
import UsageBar from "@/components/UsageBar";
import LandingPage from "@/components/LandingPage";
import type { Language, UserProfile } from "@/types";
import { FREE_TIER_LIMIT, LANGUAGE_LABELS } from "@/types";

const FREE_STORAGE_KEY = "dw_free_count";

function toTitleCase(s: string) {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

type ChatMsg = { role: "user" | "assistant"; content: string };

// ─── App Tool ─────────────────────────────────────────────────────────────────
function AppTool({ onGoHome }: { onGoHome: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [medicineName, setMedicineName] = useState("");
  const [language, setLanguage] = useState<Language>("hindi");
  const [imageBase64, setImageBase64] = useState("");
  const [imageMediaType, setImageMediaType] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  const [extractedMedicine, setExtractedMedicine] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const explanationAccum = useRef("");

  // Free query counter
  const [freeCount, setFreeCount] = useState(FREE_TIER_LIMIT);
  useEffect(() => {
    const saved = localStorage.getItem(FREE_STORAGE_KEY);
    if (saved !== null) setFreeCount(parseInt(saved, 10));
  }, []);

  // Auto-scroll to chat when it appears
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isLoading) chatRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isLoading]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          id: authUser.id,
          phone: authUser.phone,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "",
          avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || "",
          plan: "free",
          explanation_count: 0,
          created_at: authUser.created_at,
        });
      } else {
        setUser(null);
      }
    } catch { /* silently fail */ }
  }, [supabase]);

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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showUserMenu]);

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

  const handleSearchAgain = () => {
    setShowChat(false);
    setChatMessages([]);
    setExtractedMedicine("");
    setMedicineName("");
    setImageBase64("");
    setImageMediaType("");
    setError("");
    explanationAccum.current = "";
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!medicineName.trim() && !imageBase64) {
      setError("Please enter a medicine name or upload a photo");
      return;
    }
    if (!user) {
      setShowAuth(true);
      return;
    }

    setError("");
    setExtractedMedicine("");
    explanationAccum.current = "";
    setIsLoading(true);

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
              explanationAccum.current += data.text;
            } else if (data.type === "done") {
              const initialMsg: ChatMsg = { role: "assistant", content: explanationAccum.current };
              setChatMessages([initialMsg]);
              setIsLoading(false);
              setShowChat(true);
              if (data.usage_count !== null) await fetchUserProfile();
            } else if (data.type === "error") {
              setError(data.error);
              setIsLoading(false);
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
      setIsLoading(false);
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

  const displayMedicine = toTitleCase(extractedMedicine || medicineName);
  const canSubmit = (medicineName.trim().length > 0 || imageBase64.length > 0) && !isLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — matches landing page nav style */}
      <header className="sticky top-0 z-40 border-b border-border/50 app-header">
        <div className="px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onGoHome}
              className="font-semibold text-sm tracking-wide shrink-0 hover:opacity-80 transition-opacity"
              style={{ color: "#f0f8ff" }}
            >DawaiSathi</button>
            {showChat && displayMedicine && (
              <>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <span className="text-sm text-text-secondary truncate">{displayMedicine}</span>
                <span className="text-xs text-muted shrink-0 hidden sm:block">{LANGUAGE_LABELS[language]}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showChat && (
              <button
                onClick={handleSearchAgain}
                className="text-xs px-3 py-1.5 rounded-full border border-border/60 hover:border-border transition-all text-muted hover:text-text-secondary"
              >
                Search again
              </button>
            )}
            {!authLoading && (
              user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: "rgba(251,226,167,0.15)", color: "#fbe2a7" }}
                      >
                        {(user.name || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-text-secondary text-xs hidden sm:block">
                      {user.name?.split(" ")[0] || ""}
                    </span>
                  </button>
                  {showUserMenu && (
                    <div
                      className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-border/60 py-1 z-50"
                      style={{ background: "#12242e" }}
                    >
                      <button
                        onClick={() => { setShowUserMenu(false); router.push("/history"); }}
                        className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                      >
                        My History
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); handleSignOut(); }}
                        className="w-full text-left px-4 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-accent/30 hover:border-accent/60 transition-all"
                  style={{ color: "#fbe2a7" }}
                >Login</button>
              )
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={`flex-1 w-full flex flex-col ${showChat ? "max-w-4xl mx-auto px-6 sm:px-10 pt-0 pb-0" : "px-4 sm:px-6"}`}>

        {/* Form view — vertically centered, no scroll needed */}
        {!showChat && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 gap-3">
            {user && !authLoading && (
              <div className="w-full max-w-[680px]">
                <UsageBar count={user.explanation_count} plan={user.plan} onUpgrade={() => setShowPaywall(true)} />
              </div>
            )}

            <div className="app-section app-card w-full max-w-[680px] flex flex-col gap-4" style={{ animationDelay: "0.05s" }}>
              <input
                type="text"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Medicine name — e.g. Paracetamol, Metformin..."
                disabled={isLoading}
                className="w-full bg-transparent border-b border-border/60 pb-3 text-text-primary placeholder-muted/60 focus:outline-none focus:border-accent/50 transition-colors text-sm"
              />

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                <span className="text-muted/50 text-xs tracking-widest">OR</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
              </div>

              <ImageUpload
                onImageSelect={handleImageSelect}
                onClear={handleImageClear}
                hasImage={!!imageBase64}
                isLoading={imageLoading && isLoading}
              />

              <LanguageSelector selected={language} onChange={setLanguage} disabled={isLoading} />

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full rounded-xl text-sm transition-all duration-200"
                style={{
                  height: "52px",
                  background: "#fbe2a7",
                  color: "#0d1c24",
                  fontWeight: 700,
                  opacity: canSubmit ? 1 : 0.4,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                Explain
              </button>

              {!user && !authLoading && (
                <p className="text-muted/50 text-xs text-center">
                  <button onClick={() => setShowAuth(true)} className="hover:text-muted transition-colors underline underline-offset-2">
                    Login
                  </button>{" "}to save history
                </p>
              )}

              {error && (
                <p className="text-danger/80 text-xs text-center">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Loading animation */}
        <div ref={chatRef} className={showChat ? "flex-1 flex flex-col min-h-0" : ""}>
          {isLoading && (
            <div className="app-section flex-1 flex flex-col items-center justify-center gap-5">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full" style={{ border: "2px solid rgba(251,226,167,0.08)" }} />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                <div className="absolute inset-3 rounded-full animate-pulse" style={{ background: "rgba(251,226,167,0.06)" }} />
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-sm font-medium">Getting explanation...</p>
                <p className="text-muted text-xs mt-1">Analyzing your medicine</p>
              </div>
            </div>
          )}

          {/* Chat interface */}
          {showChat && (
            <div className="app-section flex-1 flex flex-col" style={{ animationDelay: "0s" }}>
              <ChatInterface
                language={language}
                initialMessages={chatMessages}
                medicineName={displayMedicine}
                onAskPharmacist={() => setShowAuth(true)}
              />
            </div>
          )}
        </div>
      </main>

      {!showChat && (
        <footer className="pb-6 text-center">
          <p className="text-muted/30 text-xs">For information only — not medical advice</p>
        </footer>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} onSuccess={handlePaymentSuccess} user={user} />}
    </div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────
function HomeContent() {
  const [showApp, setShowApp] = useState(false);
  if (showApp) return <AppTool onGoHome={() => setShowApp(false)} />;
  return <LandingPage onEnter={() => setShowApp(true)} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-5 h-5 border border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
