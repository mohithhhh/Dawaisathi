# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm start        # run production build
npm run lint     # next lint
```

There is no test suite configured in this repo.

## What this is

DawaiSathi (दवाई साथी) — a Next.js 14 App Router app that explains Indian medicines (name or photo) in 11 Indian languages for patients who can't read English prescriptions. Free tier: 3 explanations lifetime, then ₹20 one-time or ₹99/month via Razorpay.

## Architecture

**Despite the product being called "Claude-powered" in the README/marketing copy, the actual AI backend is Google Gemini, not Anthropic.** All explanation, OCR, translation, and prescription-extraction logic lives in [lib/ai.ts](lib/ai.ts) and calls the Gemini REST API directly via `fetch` (no SDK), keyed off `GOOGLE_API_KEY` (comma-separated list of keys — `geminiPost` rotates through them and retries with backoff on HTTP 429). The follow-up chat feature ([app/api/chat/route.ts](app/api/chat/route.ts)) is a *third* AI provider — Sarvam AI (`SARVAM_API_KEY`, model `sarvam-m`) — used for its strength in Indian languages, streamed as SSE with `<think>` blocks stripped out manually via a small state machine. Don't assume one model/provider when touching AI code — check which route you're in.

**Core request flow** ([app/api/explain/route.ts](app/api/explain/route.ts)):
1. Auth check via Supabase (`auth.getUser()` using cookie session) — explanation requires a signed-in user.
2. Plan/quota check against the `users` table (`free` < `FREE_TIER_LIMIT` explanations, or `paid`/active `subscription`).
3. If an image was sent instead of a name, `geminiOCR()` extracts the medicine name (with a two-pass prompt: strict brand/generic extraction, then a looser fallback if the first returns `UNKNOWN`).
4. `geminiExplain()` gets a structured English explanation, `geminiTranslate()` translates it to the target language (skipped if English).
5. Response is streamed to the client as SSE (`data: {...}\n\n`), with distinct `type` values (`medicine_name`, `text`, `done`, `error`) — the client must parse this event stream, not JSON.
6. Usage count and the explanation row are persisted **after** streaming the text, using a **service-role Supabase client** (`SUPABASE_SERVICE_ROLE_KEY`) that bypasses RLS — this is intentional since the anon/cookie client only has `auth.getUser()` scope in that request. Any route that needs to write on behalf of a user follows this two-client pattern (anon client for identity, admin client for the write).

**Prescription flow** is a separate two-step pipeline: [app/api/prescription/extract/route.ts](app/api/prescription/extract/route.ts) OCRs a photographed prescription into a JSON medicine list via Gemini (also flags `handwritten: true/false`), then [app/api/prescription/explain-all/route.ts](app/api/prescription/explain-all/route.ts) streams explanations for each medicine **sequentially** (not parallel — comment notes this is to stay under Gemini rate limits).

**Payments** ([app/api/payment/create-order/route.ts](app/api/payment/create-order/route.ts), [app/api/payment/verify/route.ts](app/api/payment/verify/route.ts)): standard Razorpay order-create + HMAC-signature-verify pattern. Three payment types exist: `one_time` (₹20 → `plan: paid`), `subscription` (₹99 → `plan: subscription` + 30-day `subscription_end`), and `pharmacist` (₹50 → inserts a `callback_requests` row instead of changing plan — a pharmacist calls the patient back). Prices are duplicated as constants in both route files; keep them in sync if changed.

**Auth**: Supabase Auth with Google OAuth only (despite what stored memory/older docs may say about phone OTP — that was an earlier design; [app/auth/callback/route.ts](app/auth/callback/route.ts) exchanges the OAuth `code` for a session via `exchangeCodeForSession`). A DB trigger (`handle_new_user` in [supabase/fresh-schema.sql](supabase/fresh-schema.sql)) auto-creates the `public.users` row on `auth.users` insert.

**`app/api/history/route.ts` and `app/api/user/profile/route.ts` are stub routes** that unconditionally return "not authenticated" / `null` — history and profile data are actually fetched client-side directly against Supabase (see [components/HistoryList.tsx](components/HistoryList.tsx)), not through these API routes. `middleware.ts` also currently force-redirects any `/history` visit to `/` with a `// No-auth mode` comment — treat `/history` as effectively disabled unless you're the one re-enabling it.

**Database**: [supabase/fresh-schema.sql](supabase/fresh-schema.sql) is the canonical, complete schema (users, explanations, payments, profiles, callback_requests, chats) — run it fresh in the Supabase SQL editor. [supabase/schema.sql](supabase/schema.sql), [supabase/payments-schema-update.sql](supabase/payments-schema-update.sql), and [supabase/pharmacist-schema.sql](supabase/pharmacist-schema.sql) are earlier incremental migrations layered on top of an older base — don't run them against a DB that already has `fresh-schema.sql` applied.

**Two Supabase clients, used consistently across API routes**: [lib/supabase.ts](lib/supabase.ts) (`createClient`) for the browser, [lib/supabase-server.ts](lib/supabase-server.ts) (`createServerSupabaseClient`) for server components using Next's `cookies()`. Individual API routes mostly construct `createServerClient` inline instead of importing the server helper (since they need both an anon client and a service-role client side by side) — follow that inline pattern rather than routing through `lib/supabase-server.ts` when you need admin-level access.

**Nearby help** ([app/api/nearby/route.ts](app/api/nearby/route.ts)): Google Places API nearby-search (pharmacies/hospitals), gated on `GOOGLE_MAPS_API_KEY`; degrades to `{configured: false, results: []}` if unset rather than erroring.

**Types**: all shared types/constants (`Language`, `Plan`, pricing constants, `LANGUAGE_LABELS`) live in [types/index.ts](types/index.ts) — check there before redefining a type or a price.

## Environment variables

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY` (Gemini, comma-separated for multiple keys), `SARVAM_API_KEY`, `GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

## Deploy

Configured for both Vercel (`vercel --prod`) and Railway ([railway.toml](railway.toml), nixpacks builder). Env vars must be set in whichever platform's dashboard is used. Supabase: run `supabase/fresh-schema.sql`, enable Google as an Auth provider.
