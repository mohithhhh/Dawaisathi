import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "https://app.posthog.com",
      capture_pageview: true,
    });
  }
}

export function track(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") {
    posthog.capture(event, properties);
  }
}
