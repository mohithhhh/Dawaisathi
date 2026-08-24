import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ["razorpay"],
  },
};

// Safe with no Sentry account configured: without SENTRY_ORG/SENTRY_PROJECT/
// SENTRY_AUTH_TOKEN set, the build-time plugin just skips source-map upload
// (a console notice, not a failure) — runtime error reporting is gated
// separately by SENTRY_DSN in the instrumentation*.ts / sentry.*.config.ts
// files, so this wrapper alone doesn't start sending anything anywhere.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: false,
  webpack: { treeshake: { removeDebugLogging: true } },
});
