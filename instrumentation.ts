import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Reports uncaught errors that escape a Route Handler / Server Component
// without going through an explicit try/catch — a safety net alongside the
// Sentry.captureException(...) calls already in the payment and explain
// routes' catch blocks (those bypass this because they're caught, not
// thrown further).
export const onRequestError = Sentry.captureRequestError;
