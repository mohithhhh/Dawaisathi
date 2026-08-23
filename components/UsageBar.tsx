"use client";

import { Plan } from "@/types";

interface UsageBarProps {
  count: number;
  plan: Plan;
  onUpgrade: () => void;
}

// Explanations are free and unlimited — this no longer shows a quota
// countdown or an "Upgrade" nudge for that. `onUpgrade` and the paid-plan
// check are kept (unused by this component's own render right now) so a
// future paid tier unrelated to explanations can reuse this same component
// without re-plumbing the prop.
export default function UsageBar({ plan }: UsageBarProps) {
  const isPaid = plan === "paid" || plan === "subscription";

  if (isPaid) {
    return (
      <div className="flex items-center gap-2 text-xs text-accent bg-accent-glow border border-accent/20 rounded-full px-3 py-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.5-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.5 6-4zm0 0c2 2.5 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.5-6 4z"/></svg>
        <span className="font-medium">
          {plan === "subscription" ? "Unlimited Plan" : "Paid Access"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      <span>Free & unlimited explanations</span>
    </div>
  );
}
