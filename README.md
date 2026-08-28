# DawaiSathi (दवाई साथी)

**Medicine explanation tool for Indian patients — in their own language.**

🌐 **Live:** [dawaisathi.vercel.app](https://dawaisathi.vercel.app)

---

## What it does

73 crore Indians cannot read English prescriptions. DawaiSathi bridges that gap by explaining any medicine — what it's for, how to take it, side effects, and warnings — in plain, simple language across 11 Indian languages.

**Core features:**
- **Type or photograph** — Enter a medicine name or snap a photo of any strip, bottle, or packaging
- **AI-powered explanation** — Claude AI identifies the medicine and explains it clearly in under 10 seconds
- **11 Indian languages** — Hindi, English, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu
- **Medicine Chat** — Ask follow-up questions in a conversational interface after getting an explanation
- **Photo OCR** — Works even with tilted or blurry packaging photos
- **History** — Signed-in users can revisit past explanations
- **Google Sign In** — One-tap authentication via Supabase + Google OAuth

**Pricing:**
| Plan | Price | Includes |
|---|---|---|
| Free | ₹0 | 3 explanations, all languages, photo scan |
| Pay as you go | ₹20 one-time | Unlimited explanations, chat, history |
| Monthly | ₹99/month | Everything + priority processing |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Payments | Razorpay |
| Deploy | Vercel |

---

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env.local
# Fill in your credentials (see table below)
```

### 3. Set up Supabase database
Run `supabase/schema.sql` in your [Supabase SQL Editor](https://app.supabase.com/project/_/sql).

Enable **Google Auth** in Supabase: Authentication → Providers → Google → Enable.

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
vercel --prod
# Add all environment variables in the Vercel dashboard
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | Claude API key (server-side only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (server-side only) |

---

## Project Structure

```
app/
  api/
    explain/        # Medicine explanation + photo OCR (SSE streaming)
    chat/           # Follow-up chat with context
    payment/        # Razorpay order creation & verification
    history/        # User explanation history
  auth/callback/    # Google OAuth callback
  page.tsx          # Main app entry (landing + app tool)
components/
  LandingPage.tsx   # Marketing landing page
  AuthModal.tsx     # Google Sign In modal
  ChatInterface.tsx # Follow-up chat UI
  ExplanationCard.tsx
  ImageUpload.tsx
  PaywallModal.tsx
lib/
  supabase.ts       # Browser Supabase client
  supabase-server.ts # Server Supabase client
supabase/
  schema.sql        # Database schema + triggers
types/
  index.ts          # Shared TypeScript types
```

---



> For information only — not medical advice. Always consult your doctor.
