"use client";

import { FREE_TIER_LIMIT, Plan } from "@/types";

interface UsageBarProps {
  count: number;
  plan: Plan;
  onUpgrade: () => void;
}

export default function UsageBar({ count, plan, onUpgrade }: UsageBarProps) {
  const isPaid =
    plan === "paid" || plan === "subscription";

  if (isPaid) {
    return (
      <div className="flex items-center gap-2 text-xs text-accent bg-accent-glow border border-accent/20 rounded-full px-3 py-1.5">
        <span>♾️</span>
        <span className="font-medium">
          {plan === "subscription" ? "Unlimited Plan" : "Paid Access"}
        </span>
      </div>
    );
  }

  const remaining = Math.max(0, FREE_TIER_LIMIT - count);
  const percentage = (count / FREE_TIER_LIMIT) * 100;
  const isNearLimit = remaining <= 1;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-muted text-xs">
            {remaining > 0
              ? `${remaining} free ${remaining === 1 ? "query" : "queries"} left`
              : "Free limit reached"}
          </span>
          <span className="text-muted text-xs">{count}/{FREE_TIER_LIMIT}</span>
        </div>
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isNearLimit ? "bg-danger" : "bg-accent"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      {isNearLimit && (
        <button
          onClick={onUpgrade}
          className="shrink-0 text-xs bg-accent text-background font-medium px-3 py-1.5 rounded-full hover:bg-accent/90 transition-all"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
