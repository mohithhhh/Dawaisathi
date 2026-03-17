# DawaiSathi (दवाई साथी) 💊

> Medicine explanation tool for Indian patients who can't read English prescriptions.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env.local
# Fill in your Supabase, Anthropic, and Razorpay credentials
```

### 3. Set up Supabase database
Run `supabase/schema.sql` in your [Supabase SQL Editor](https://app.supabase.com/project/_/sql).

Enable **Phone Auth** in Supabase: Authentication → Providers → Phone → Enable.

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
vercel --prod
# Add environment variables in Vercel dashboard
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | Claude API key (server-side only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay key ID (safe to expose) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret (server-side only) |

## Features
- Medicine name lookup by typing or photo upload (Claude Vision)
- 6 Indian languages: Hindi, English, Kannada, Telugu, Malayalam, Tamil
- Phone OTP authentication via Supabase (no email needed)
- Freemium: 3 free, then Rs 20 one-time or Rs 99/month
- History of last 10 explanations
- All AI calls server-side (API key never exposed to client)
