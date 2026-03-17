"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ExplanationCard from "@/components/ExplanationCard";
import HistoryList from "@/components/HistoryList";
import type { Explanation, Language } from "@/types";

export default function HistoryPage() {
  const router = useRouter();
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [selected, setSelected] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history");
        if (res.status === 401) {
          router.push("/?auth=required");
          return;
        }
        if (!res.ok) {
          setError("Failed to load history");
          return;
        }
        const data = await res.json();
        setExplanations(data.explanations || []);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-muted hover:text-text-primary transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2"
          >
            ←
          </button>
          <div>
            <h1 className="text-text-primary font-bold text-base">
              Medicine History
            </h1>
            <p className="text-muted text-xs">पिछली दवाइयाँ</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface-2 border border-border rounded-xl h-20 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-danger text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-accent text-sm mt-2 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : selected ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-muted hover:text-text-primary transition-colors text-sm"
            >
              ← Back to history
            </button>
            <div className="bg-surface border border-border rounded-2xl p-4">
              <ExplanationCard
                medicineName={selected.medicine_name}
                explanation={selected.explanation_text}
                language={selected.language as Language}
                isStreaming={false}
              />
            </div>
            <p className="text-muted text-xs text-center">
              Saved on{" "}
              {new Date(selected.created_at).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        ) : (
          <HistoryList
            explanations={explanations}
            onSelect={setSelected}
          />
        )}
      </main>

      <footer className="border-t border-border py-4 px-4 text-center">
        <p className="text-muted text-xs">
          ⚕ For information only — not medical advice
        </p>
      </footer>
    </div>
  );
}
