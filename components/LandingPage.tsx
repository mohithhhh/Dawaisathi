"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";

// ─── Scroll Reveal ─────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("revealed")),
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Count-up animation ────────────────────────────────────────────────────────
function CountUp({
  value,
  suffix = "",
  duration = 1400,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !ran.current) {
          ran.current = true;
          obs.disconnect();
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(eased * value));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const LANGS = [
  "हिंदी", "English", "বাংলা", "ગુજરાતી",
  "ಕನ್ನಡ", "മലയാളം", "मराठी", "ଓଡ଼ିଆ", "ਪੰਜਾਬੀ", "தமிழ்", "తెలుగు",
];

const MEDICINE_WORDS = [
  { lang: "हिंदी", word: "दवाई" },
  { lang: "English", word: "Medicine" },
  { lang: "বাংলা", word: "ওষুধ" },
  { lang: "ਪੰਜਾਬੀ", word: "ਦਵਾਈ" },
  { lang: "ગુજરાતી", word: "દવા" },
  { lang: "ಕನ್ನಡ", word: "ಔಷಧ" },
  { lang: "മലയാളം", word: "മരുന്ന്" },
  { lang: "मराठी", word: "औषध" },
  { lang: "ଓଡ଼ିଆ", word: "ଔଷଧ" },
  { lang: "தமிழ்", word: "மருந்து" },
  { lang: "తెలుగు", word: "మందు" },
];

const STEPS = [
  {
    n: "01",
    title: "Type or photograph",
    desc: "Type the medicine name or snap a photo of your strip, bottle, or packaging — even if it's tilted or blurry.",
  },
  {
    n: "02",
    title: "AI reads & understands",
    desc: "Our AI identifies the medicine, looks up its use, dosage, and important warnings — in under 10 seconds.",
  },
  {
    n: "03",
    title: "Explained in your language",
    desc: "Get a clear, jargon-free explanation in Hindi, Tamil, Bengali, Punjabi, or any of 11 Indian languages.",
  },
];

const FEATURES = [
  { title: "11 Indian Languages", desc: "From Hindi to Tamil, Bengali to Kannada — we speak your patient's language." },
  { title: "Smart Photo Scan", desc: "Point your camera at any medicine strip or packaging. Our AI reads it even when tilted." },
  { title: "Under 10 Seconds", desc: "No waiting. Advanced AI delivers plain-language explanations instantly." },
  { title: "Medicine Chat", desc: "Ask follow-up questions in a friendly conversational interface." },
  { title: "Private & Secure", desc: "Your queries are processed securely. We never sell your data." },
  { title: "Free to Start", desc: "3 free explanations. No account, no credit card — start immediately." },
];


const PRICING = [
  {
    label: "Free",
    price: "₹0",
    period: "forever",
    highlight: false,
    tag: null,
    features: ["3 free explanations", "All 11 languages", "Photo scan", "No signup needed"],
    cta: "Try for Free",
  },
  {
    label: "Pay as you go",
    price: "₹20",
    period: "one-time",
    highlight: true,
    tag: "Most Popular",
    features: ["Unlimited explanations", "All 11 languages", "Photo scan", "Medicine chat", "Explanation history"],
    cta: "Get Started",
  },
  {
    label: "Monthly",
    price: "₹99",
    period: "per month",
    highlight: false,
    tag: null,
    features: ["Everything in Pay as you go", "Priority AI processing", "Early access to new features"],
    cta: "Subscribe",
  },
];

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#fbe2a7" }}>
      {children}
    </p>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const supabase = createClient();
  const [selectedLang, setSelectedLang] = useState("English");
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [parallaxY, setParallaxY] = useState(0);
  const [navUser, setNavUser] = useState<{ name: string; avatar_url: string } | null>(null);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const navMenuRef = useRef<HTMLDivElement>(null);
  useScrollReveal();

  const fetchNavUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setNavUser({
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "",
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
        });
      } else {
        setNavUser(null);
      }
    } catch { /* silently fail */ }
  }, [supabase]);

  useEffect(() => {
    fetchNavUser();
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") fetchNavUser();
        else if (event === "SIGNED_OUT") setNavUser(null);
      });
      return () => subscription.unsubscribe();
    } catch { return undefined; }
  }, [supabase.auth, fetchNavUser]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) {
        setShowNavMenu(false);
      }
    };
    if (showNavMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNavMenu]);

  useEffect(() => {
    const handler = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      setParallaxY(y * 0.35);
      const total = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? y / total : 0);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const marqueeItems = [...MEDICINE_WORDS, ...MEDICINE_WORDS];

  return (
    <div style={{ backgroundColor: "#0d1c24", color: "#f0f8ff" }}>

      {/* Scroll progress bar */}
      <div
        className="fixed top-0 left-0 z-[200] h-[2px] pointer-events-none"
        style={{
          width: `${scrollProgress * 100}%`,
          background: "linear-gradient(to right, #fbe2a7, #f0d090)",
          boxShadow: "0 0 8px rgba(251,226,167,0.5)",
        }}
      />

      {/* ════════════════════════════════════════════════════════════════════
          STICKY NAVBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 transition-all duration-300"
        style={
          scrolled
            ? { background: "rgba(13,28,36,0.92)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }
            : {}
        }
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-wide" style={{ color: "#f0f8ff" }}>DawaiSathi</span>
        </div>

        <div className="hidden sm:flex items-center gap-7 text-sm" style={{ color: "#a8bec9" }}>
          <a href="#how-it-works" className="hover:text-white transition-colors cursor-pointer">How it works</a>
          <a href="#languages" className="hover:text-white transition-colors cursor-pointer">Languages</a>
          <a href="#pricing" className="hover:text-white transition-colors cursor-pointer">Pricing</a>
        </div>

        {navUser ? (
          <div className="relative" ref={navMenuRef}>
            <button
              onClick={() => setShowNavMenu((v) => !v)}
              className="flex items-center gap-2 rounded-full hover:opacity-80 transition-opacity"
            >
              {navUser.avatar_url ? (
                <img src={navUser.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "rgba(251,226,167,0.15)", color: "#fbe2a7" }}
                >
                  {(navUser.name || "U")[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm hidden sm:block" style={{ color: "#a8bec9" }}>
                {navUser.name?.split(" ")[0] || ""}
              </span>
            </button>
            {showNavMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-40 rounded-xl border py-1 z-50"
                style={{ background: "#12242e", borderColor: "rgba(255,255,255,0.1)" }}
              >
                <button
                  onClick={() => { setShowNavMenu(false); onEnter(); }}
                  className="w-full text-left px-4 py-2 text-xs transition-colors"
                  style={{ color: "#a8bec9" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f8ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#a8bec9"; }}
                >
                  Open App
                </button>
                <button
                  onClick={async () => { setShowNavMenu(false); await supabase.auth.signOut(); setNavUser(null); }}
                  className="w-full text-left px-4 py-2 text-xs transition-colors"
                  style={{ color: "#a8bec9" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f8ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#a8bec9"; }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
            style={{ background: "rgba(251,226,167,0.1)", color: "#fbe2a7", border: "1px solid rgba(251,226,167,0.22)" }}
          >
            Sign in
          </button>
        )}
      </nav>

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="min-h-screen flex flex-col relative overflow-hidden"
        style={{
          backgroundImage: "url('/background/dawaisathi_minimalist_background.png')",
          backgroundSize: "cover",
          backgroundPosition: `50% ${-parallaxY * 0.3}px`,
          backgroundColor: "#0d1c24",
        }}
      >
        {/* gradient overlay — fades capsule into content area */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, transparent 38%, rgba(13,28,36,0.85) 55%, #0d1c24 72%)",
            zIndex: 1,
          }}
        />

        {/* spacer — lets capsule in bg image breathe */}
        <div className="h-[42vh]" style={{ zIndex: 2 }} />

        <main className="relative flex flex-col items-center px-6 pb-16 text-center" style={{ zIndex: 2 }}>
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
            style={{ border: "1px solid rgba(255,255,255,0.14)", background: "rgba(13,28,36,0.6)", backdropFilter: "blur(8px)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#fbe2a7" }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "#a8bec9" }}>
              AI-POWERED · FREE TO TRY
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-bold leading-tight mb-4 max-w-3xl"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "#f0f8ff" }}
          >
            Understand Your Medicine<br />In Your Language
          </h1>

          <p className="text-base mb-8 max-w-lg leading-relaxed" style={{ color: "#a8bec9" }}>
            No medical jargon. No English required. Just clear, simple explanations for every Indian patient.
          </p>

          {/* Language pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className="text-sm px-4 py-1.5 rounded-full transition-all"
                style={
                  selectedLang === lang
                    ? { border: "1px solid rgba(251,226,167,0.55)", color: "#fbe2a7", background: "rgba(251,226,167,0.09)" }
                    : { border: "1px solid rgba(255,255,255,0.12)", color: "#a8bec9", background: "transparent" }
                }
              >
                {lang}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={onEnter}
            className="inline-flex items-center gap-3 px-9 py-4 rounded-2xl font-bold text-lg transition-all duration-200 active:scale-95 mb-3"
            style={{
              background: "linear-gradient(135deg, #fbe2a7 0%, #f0d090 100%)",
              color: "#0d1c24",
              boxShadow: "0 0 40px rgba(251,226,167,0.3), 0 4px 20px rgba(0,0,0,0.4)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 65px rgba(251,226,167,0.5), 0 4px 24px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 40px rgba(251,226,167,0.3), 0 4px 20px rgba(0,0,0,0.4)";
            }}
          >
            <span>Explain My Medicine</span>
            <span style={{ opacity: 0.6 }}>→</span>
          </button>

          <p className="text-xs" style={{ color: "#6b8a9a" }}>3 free explanations · No signup needed</p>
        </main>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" style={{ color: "rgba(251,226,167,0.35)", zIndex: 2 }}>
          <span style={{ fontSize: 9, letterSpacing: "0.18em" }} className="uppercase">scroll</span>
          <svg className="bob" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 5l5 5 5-5" />
          </svg>
        </div>

        {/* Star */}
        <div className="absolute bottom-5 right-6" style={{ color: "rgba(255,255,255,0.18)", zIndex: 2 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.7 10.3L22 12L13.7 13.7L12 22L10.3 13.7L2 12L10.3 10.3Z" />
          </svg>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          STATS BAR — numbers count up on scroll
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: "#0e2030", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { countTo: 11, display: null, label: "Indian Languages" },
            { countTo: 3,  display: null, label: "Free Queries" },
            { countTo: null, display: "<10s", label: "Response Time" },
            { countTo: null, display: "₹0",   label: "To Get Started" },
          ].map(({ countTo, display, label }, i) => (
            <div key={label} data-reveal data-delay={String(i + 1)}>
              <p className="font-bold mb-1" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "#fbe2a7" }}>
                {countTo !== null ? <CountUp value={countTo} /> : display}
              </p>
              <p className="text-xs tracking-widest uppercase" style={{ color: "#6b8a9a" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PROBLEM / CONTEXT — stat cards count up
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <div data-reveal="left">
              <SectionLabel>The Problem</SectionLabel>
              <h2 className="font-bold leading-tight mb-5" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)" }}>
                73 crore Indians can't read their prescription
              </h2>
              <p className="leading-relaxed mb-4" style={{ color: "#a8bec9" }}>
                Most medicine labels, prescriptions, and leaflets in India are written in English — a language
                that the majority of patients don't fully read or understand.
              </p>
              <p className="leading-relaxed" style={{ color: "#a8bec9" }}>
                This creates confusion, missed doses, and dangerous misuse. DawaiSathi bridges that gap — instantly,
                in the patient's own mother tongue.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4" data-reveal="right">
              {[
                { countTo: 73, suffix: " Cr", display: null, desc: "Indians don't read English fluently" },
                { countTo: 22, suffix: "",    display: null, desc: "Official languages in India" },
                { countTo: 40, suffix: "%",   display: null, desc: "Medication errors from misunderstanding" },
                { countTo: null, suffix: "",  display: "10s", desc: "Time to get a clear explanation" },
              ].map(({ countTo, suffix, display, desc }, i) => (
                <div
                  key={desc}
                  className="rounded-2xl p-5 card-hover"
                  style={{
                    background: i % 2 === 0 ? "rgba(251,226,167,0.05)" : "rgba(243,227,234,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <p className="font-bold text-2xl mb-1" style={{ color: i % 2 === 0 ? "#fbe2a7" : "#f3e3ea" }}>
                    {countTo !== null ? <CountUp value={countTo} suffix={suffix} /> : display}
                  </p>
                  <p className="text-xs leading-snug" style={{ color: "#6b8a9a" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HOW IT WORKS — line draws, cards lift on hover
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="py-24 px-6"
        style={{ background: "#0e2030" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16" data-reveal>
            <SectionLabel>Simple Process</SectionLabel>
            <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
              From photo to understanding<br />in 3 steps
            </h2>
            <p style={{ color: "#a8bec9" }}>Works for everyone. No medical knowledge needed.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* Connecting line — draws left to right on scroll */}
            <div
              data-reveal="line"
              className="hidden sm:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px"
              style={{
                background: "linear-gradient(to right, rgba(251,226,167,0.2), rgba(251,226,167,0.5), rgba(251,226,167,0.2))",
                transformOrigin: "left center",
              }}
            />

            {STEPS.map((step, i) => (
              <div
                key={step.n}
                data-reveal
                data-delay={String(i + 1)}
                className="rounded-2xl p-7 relative card-hover float-card"
                style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold mb-5"
                  style={{ background: "linear-gradient(135deg, #fbe2a7, #f0d090)", color: "#0d1c24" }}
                >
                  {step.n}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#a8bec9" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          LANGUAGE MARQUEE
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="languages"
        className="py-16 overflow-hidden"
        style={{ background: "#0d1c24", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="text-center mb-10 px-6" data-reveal>
          <SectionLabel>11 Languages</SectionLabel>
          <h2 className="font-bold" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)" }}>
            One app. Every Indian tongue.
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#a8bec9" }}>
            The same word, explained clearly — in whichever language your family speaks.
          </p>
        </div>

        {/* Row 1 — gold */}
        <div className="overflow-hidden mb-3">
          <div className="marquee-fwd">
            {marqueeItems.map(({ lang, word }, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center px-5 py-3 rounded-xl mx-1.5"
                style={{ background: "rgba(251,226,167,0.06)", border: "1px solid rgba(251,226,167,0.14)", minWidth: 110 }}
              >
                <span className="text-xl font-bold" style={{ color: "#fbe2a7" }}>{word}</span>
                <span className="text-xs mt-0.5" style={{ color: "#6b8a9a" }}>{lang}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — blush, reverse */}
        <div className="overflow-hidden">
          <div className="marquee-rev">
            {[...marqueeItems].reverse().map(({ lang, word }, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center px-5 py-3 rounded-xl mx-1.5"
                style={{ background: "rgba(243,227,234,0.05)", border: "1px solid rgba(243,227,234,0.1)", minWidth: 110 }}
              >
                <span className="text-xl font-bold" style={{ color: "#f3e3ea" }}>{word}</span>
                <span className="text-xs mt-0.5" style={{ color: "#6b8a9a" }}>{lang}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FEATURES — shimmer sweep on hover
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6" style={{ background: "#0e2030" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16" data-reveal>
            <SectionLabel>Why DawaiSathi</SectionLabel>
            <h2 className="font-bold" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
              Everything your family needs
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                data-reveal
                data-delay={String(Math.min((i % 3) + Math.floor(i / 3) + 1, 5))}
                className="rounded-2xl p-6 card-hover"
                style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#a8bec9" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          PRICING — highlighted card breathes glow
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="pricing"
        className="py-24 px-6"
        style={{ background: "#0d1c24" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16" data-reveal>
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
              Honest, simple pricing
            </h2>
            <p style={{ color: "#a8bec9" }}>Start free. Pay only when you need more.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {PRICING.map((plan, i) => (
              <div
                key={plan.label}
                data-reveal
                data-delay={String(i + 1)}
                className="rounded-2xl p-7 flex flex-col"
                style={
                  plan.highlight
                    ? { background: "rgba(251,226,167,0.05)", border: "1px solid rgba(251,226,167,0.28)", boxShadow: "0 0 30px rgba(251,226,167,0.06)" }
                    : { background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }
                }
              >
                {plan.tag && (
                  <div
                    className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full w-fit mb-4"
                    style={{ background: "rgba(251,226,167,0.14)", color: "#fbe2a7" }}
                  >
                    {plan.tag}
                  </div>
                )}

                <p className="text-sm mb-1" style={{ color: "#a8bec9" }}>{plan.label}</p>
                <p className="font-bold mb-0.5" style={{ fontSize: "2.2rem", color: plan.highlight ? "#fbe2a7" : "#f0f8ff" }}>
                  {plan.price}
                </p>
                <p className="text-xs mb-6" style={{ color: "#6b8a9a" }}>{plan.period}</p>

                <ul className="space-y-3 flex-1 mb-7">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm" style={{ color: "#a8bec9" }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: "#fbe2a7" }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onEnter}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                  style={
                    plan.highlight
                      ? { background: "linear-gradient(135deg, #fbe2a7, #f0d090)", color: "#0d1c24" }
                      : { background: "rgba(251,226,167,0.08)", color: "#fbe2a7", border: "1px solid rgba(251,226,167,0.2)" }
                  }
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FINAL CTA — rings pulse slowly
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="py-32 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #0d1c24 0%, #12242e 50%, #0d1c24 100%)" }}
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(251,226,167,0.08) 0%, transparent 60%)" }}
        />
        {/* Decorative rings — pulse in and out */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ border: "1px solid rgba(251,226,167,0.05)" }}
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{ border: "1px solid rgba(251,226,167,0.08)" }}
        />

        <div className="relative z-10 max-w-2xl mx-auto" data-reveal="scale">
          <h2 className="font-bold mb-4" style={{ fontSize: "clamp(1.9rem, 4.5vw, 3rem)", color: "#f0f8ff" }}>
            Ready to understand your medicine?
          </h2>
          <p className="mb-10 text-base leading-relaxed max-w-lg mx-auto" style={{ color: "#a8bec9" }}>
            Join Indian families who now understand their prescriptions clearly — in their own language.
          </p>
          <button
            onClick={onEnter}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-xl transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #fbe2a7 0%, #f0d090 100%)",
              color: "#0d1c24",
              boxShadow: "0 0 60px rgba(251,226,167,0.35), 0 8px 32px rgba(0,0,0,0.4)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 90px rgba(251,226,167,0.5), 0 8px 32px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 60px rgba(251,226,167,0.35), 0 8px 32px rgba(0,0,0,0.4)";
            }}
          >
            <span>Explain My Medicine</span>
            <span style={{ opacity: 0.6 }}>→</span>
          </button>
          <p className="mt-4 text-xs" style={{ color: "#6b8a9a" }}>
            3 free explanations · No signup · Works instantly
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer
        className="px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ background: "#090f14", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm">DawaiSathi</span>
          <span className="text-xs" style={{ color: "#4a6a7a" }}>— Medicine Companion</span>
        </div>

        <p className="text-xs text-center" style={{ color: "#4a6a7a" }}>
          For information only — not medical advice. Always consult your doctor.
        </p>

        <p className="text-xs" style={{ color: "#4a6a7a" }}>Made for India</p>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
    </div>
  );
}
