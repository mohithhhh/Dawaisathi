# DawaiSathi — Project Log

## Project: दवाई साथी (DawaiSathi)
**Purpose:** Medicine explanation tool for Indian patients who can't read English prescriptions.
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · Claude API · Razorpay · Vercel

---

## Session 1 — 2026-03-07: Full Project Build

### What was built
Complete working web app from scratch, file by file. 25 files created.

### File Manifest

| File | Purpose |
|---|---|
| `package.json` | Dependencies: next 14, @anthropic-ai/sdk, @supabase/ssr, razorpay |
| `next.config.mjs` | Next.js config with razorpay as external package |
| `tailwind.config.ts` | Dark navy theme with warm gold + blush accents |
| `postcss.config.js` | PostCSS for Tailwind |
| `tsconfig.json` | TypeScript config with path alias `@/*` |
| `middleware.ts` | Session refresh + /history route protection |
| `app/layout.tsx` | Root layout, Noto Sans fonts (all Indian scripts), SEO metadata |
| `app/globals.css` | Global styles, Google Fonts import, custom scrollbar |
| `app/page.tsx` | Main page — medicine input, image upload, language select, streaming result |
| `app/history/page.tsx` | History view — last 10 explanations |
| `app/api/explain/route.ts` | **Core API** — Claude Vision OCR + streaming SSE explanation |
| `app/api/payment/create-order/route.ts` | Razorpay order creation |
| `app/api/payment/verify/route.ts` | HMAC signature verification + plan upgrade |
| `app/api/user/profile/route.ts` | Auto-create user profile on first login |
| `app/api/history/route.ts` | Fetch last 10 explanations for logged-in user |
| `components/AuthModal.tsx` | Phone OTP flow with +91 prefix |
| `components/ImageUpload.tsx` | Drag & drop + click upload, 5MB limit, preview |
| `components/LanguageSelector.tsx` | 6-language grid (Hindi, English, Kannada, Telugu, Malayalam, Tamil) |
| `components/ExplanationCard.tsx` | Streaming result card with shimmer animation |
| `components/PaywallModal.tsx` | ₹20 one-time / ₹99/month Razorpay payment modal |
| `components/HistoryList.tsx` | Clickable history item list |
| `components/UsageBar.tsx` | Free tier usage progress bar (3 free queries) |
| `lib/supabase.ts` | Browser-side Supabase client |
| `lib/supabase-server.ts` | Server-side Supabase client (cookie-based sessions) |
| `types/index.ts` | Shared TypeScript types + constants |
| `supabase/schema.sql` | Full DB schema with RLS policies and triggers |
| `.env.example` | Template for required environment variables |
| `.env.local` | Local env (gitignored) |

### Architecture Decisions

**Claude model:** `claude-sonnet-4-20250514` (user-specified)

**Image flow:** User uploads → base64 in request body → Claude Vision extracts medicine name → auto-populates text field → explanation streamed back. Both steps in single `/api/explain` route.

**Streaming:** Server-Sent Events (`text/event-stream`). Events:
- `{ type: "medicine_name", medicine_name: "..." }` — extracted name
- `{ type: "text", text: "..." }` — streamed explanation chunks
- `{ type: "done", usage_count: N, plan: "..." }` — completion + usage
- `{ type: "error", error: "..." }` — error state

**Auth:** Supabase Phone OTP only. No email. Auto-creates `public.users` row via DB trigger on `auth.users` insert.

**Paywall logic:** Free tier = 3 explanations lifetime per user. Checked both client-side (before API call) and server-side (API returns 402). After payment, plan updates to `paid` (one-time) or `subscription` (monthly).

**Security:** `ANTHROPIC_API_KEY` and `RAZORPAY_KEY_SECRET` are server-side only. Never in client bundle. Razorpay signature verified with HMAC-SHA256 before updating plan.

### Color Theme (user-specified)
- `#fbe2a7` — warm gold, primary accent
- `#12242e` → `#0d1c24` — dark navy, background/surface
- `#f3e3ea` — soft blush, secondary accent
- Text: `#f0f8ff` primary, `#a8bec9` secondary

### Claude Prompt Structure
```
What this medicine treats (one simple sentence)
How to take it (timing, food, dosage)
One important thing to remember
2-3 other brand names for same medicine
— Entirely in selected language, under 150 words, warm pharmacist tone
```

---

## Fixes Applied

### Fix 1 — @types/razorpay doesn't exist
**Error:** `npm error 404 Not Found - GET https://registry.npmjs.org/@types%2frazorpay`
**Fix:** Removed `"@types/razorpay": "^1.0.0"` from `package.json` devDependencies. The `razorpay` package ships its own types.

### Fix 2 — next.config.ts not supported in Next.js 14
**Error:** `Configuring Next.js via 'next.config.ts' is not supported`
**Fix:** Renamed `next.config.ts` → `next.config.mjs`, converted to CommonJS-style export with JSDoc type annotation.

### Fix 3 — Frontend crashes without env vars
**Issue:** App crashes on startup if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.
**Fix:** Added placeholder fallback values in `lib/supabase.ts`, `lib/supabase-server.ts`, and `middleware.ts`. Middleware now skips auth logic entirely when no real Supabase URL is set. Frontend renders in "demo mode" — UI fully visible, auth/DB features gracefully unavailable.

### Fix 4 — Landing hero page added
**Request:** Impressive homepage with title, subtitle, and CTA button that reveals the tool.
**Change:** `app/page.tsx` now has two states:
- `showApp = false` → `LandingHero` component (full-screen landing with gradient title, language pills, glowing CTA button)
- `showApp = true` → `AppTool` component (the medicine explanation interface)
- Button "दवाई समझाइए →" triggers the transition with `animate-fade-in`
- Hero uses `#fbe2a7`/`#f3e3ea` gradient text, glow button, decorative background blobs, trust stats row

---

## Setup Checklist (for production)

- [ ] Create Supabase project at https://app.supabase.com
- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Enable Phone auth: Authentication → Providers → Phone → Enable
- [ ] Get Anthropic API key from https://console.anthropic.com/keys
- [ ] Get Razorpay keys from https://dashboard.razorpay.com/app/keys
- [ ] Fill in `.env.local` (or Vercel env vars for deployment)
- [ ] Deploy: `vercel --prod`

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
```
