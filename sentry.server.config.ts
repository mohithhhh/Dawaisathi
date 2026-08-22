import * as Sentry from "@sentry/nextjs";

// See instrumentation-client.ts for why DSN is left unset by default.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enabled: !!process.env.SENTRY_DSN,
});
