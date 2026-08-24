"use client";

import { Explanation, LANGUAGE_LABELS, Language } from "@/types";

interface HistoryListProps {
  explanations: Explanation[];
  onSelect: (exp: Explanation) => void;
}

export default function HistoryList({
  explanations,
  onSelect,
}: HistoryListProps) {
  if (explanations.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="flex justify-center mb-3">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(168,190,201,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m10.5 20.5-8-8a5 5 0 1 1 7-7l8 8a5 5 0 1 1-7 7Z"/><path d="m8.5 8.5 7 7"/>
          </svg>
        </div>
        <p className="text-text-secondary">No explanations yet</p>
        <p className="text-muted text-sm mt-1">
          Search for a medicine to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {explanations.map((exp) => (
        <button
          key={exp.id}
          onClick={() => onSelect(exp)}
          className="w-full text-left bg-surface-2 border border-border hover:border-accent/30 rounded-xl p-4 transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-accent font-semibold text-sm truncate">
                  {exp.medicine_name}
                </span>
                <span className="text-muted text-xs shrink-0 bg-surface px-2 py-0.5 rounded-full">
                  {LANGUAGE_LABELS[exp.language as Language] || exp.language}
                </span>
              </div>
              <p className="text-text-secondary text-xs mt-1 line-clamp-2">
                {exp.explanation_text}
              </p>
            </div>
            <span className="text-muted text-xs shrink-0 mt-0.5">
              {new Date(exp.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
