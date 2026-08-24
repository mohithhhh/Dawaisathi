import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_SENTRY_DSN is currently unset in .env.local, which makes this a
// safe no-op — Sentry.init() with an empty DSN just doesn't send anything.
// Set it (and SENTRY_DSN for the server/edge configs) to start receiving
// errors. No session replay / feedback widget here on purpose: this app
// handles medicine names and phone numbers, and those integrations record
// on-screen content — turn them on deliberately later if you want them, not
// as a side effect of wiring up basic error tracking.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
