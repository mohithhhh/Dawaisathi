"use client";

import { LANGUAGE_LABELS, Language } from "@/types";

interface ExplanationCardProps {
  medicineName: string;
  explanation: string;
  language: Language;
  isStreaming: boolean;
}

export default function ExplanationCard({
  medicineName,
  explanation,
  language,
  isStreaming,
}: ExplanationCardProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `${medicineName}\n\n${explanation}\n\n— DawaiSathi (दवाई साथी)`
    );
  };

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-text-primary font-semibold text-base leading-tight">
            {medicineName}
          </h3>
          <span className="text-muted text-xs">
            {LANGUAGE_LABELS[language]}
          </span>
        </div>
        {!isStreaming && (
          <button
            onClick={copyToClipboard}
            className="text-muted hover:text-accent transition-colors text-xs px-2 py-1 rounded-lg hover:bg-surface-2 border border-border"
            title="Copy explanation"
          >
            Copy
          </button>
        )}
      </div>

      {/* Explanation text */}
      <div className="bg-surface-2 border border-border rounded-xl p-4 relative overflow-hidden">
        {isStreaming && (
          <div className="absolute inset-0 bg-shimmer-gradient bg-[length:200%_100%] animate-shimmer opacity-30 pointer-events-none" />
        )}

        <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-devanagari">
          {explanation}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
          )}
        </div>

        {isStreaming && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <span className="text-muted text-xs">Writing explanation...</span>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      {!isStreaming && (
        <p className="text-muted text-xs mt-2 text-center">
          For information only — not medical advice. Consult your doctor.
        </p>
      )}
    </div>
  );
}
