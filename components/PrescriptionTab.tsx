"use client";

import { useState, useRef, useCallback } from "react";
import LanguageSelector from "@/components/LanguageSelector";
import type { Language } from "@/types";

type ResultStatus = "loading" | "done" | "error";

interface MedicineResult {
  medicine: string;
  explanation: string;
  status: ResultStatus;
}

function renderContent(content: string) {
  return content.split("\n").map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, pi) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={pi} style={{ color: "#fbe2a7" }}>{part.slice(2, -2)}</strong>
      ) : part
    );
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={li} className="font-semibold mt-3 mb-1" style={{ color: "#fbe2a7" }}>{rendered}</p>;
    }
    return line.trim() ? <p key={li} className="text-sm leading-relaxed mb-1" style={{ color: "#c4d8e0" }}>{rendered}</p> : <div key={li} className="h-1" />;
  });
}

function SkeletonCard({ medicine }: { medicine: string }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-sm font-semibold mb-4" style={{ color: "#fbe2a7" }}>{medicine}</p>
      <p className="text-xs mb-3" style={{ color: "#6b8a9a" }}>Explaining {medicine}...</p>
      <div className="space-y-2">
        {[80, 60, 90, 50].map((w, i) => (
          <div key={i} className="h-3 rounded-full animate-pulse" style={{ width: `${w}%`, background: "rgba(255,255,255,0.07)" }} />
        ))}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  onRetry,
  onPharmacist,
}: {
  result: MedicineResult;
  onRetry: () => void;
  onPharmacist: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (result.status === "error") {
    return (
      <div className="rounded-2xl p-6" style={{ background: "#12242e", border: "1px solid rgba(239,68,68,0.25)" }}>
        <p className="text-sm font-semibold mb-2" style={{ color: "#fbe2a7" }}>{result.medicine}</p>
        <p className="text-xs mb-4" style={{ color: "#a8bec9" }}>Could not get explanation for this medicine.</p>
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded-full transition-all"
          style={{ background: "rgba(251,226,167,0.1)", color: "#fbe2a7", border: "1px solid rgba(251,226,167,0.2)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6" style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="font-semibold text-base" style={{ color: "#fbe2a7" }}>{result.medicine}</p>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg transition-all"
          style={{ background: "rgba(255,255,255,0.05)", color: copied ? "#4ade80" : "#6b8a9a", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Explanation */}
      <div className="mb-5">{renderContent(result.explanation)}</div>

      {/* Feedback */}
      <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-xs mr-1" style={{ color: "#6b8a9a" }}>Helpful?</span>
        <button
          onClick={() => setFeedback("up")}
          className="transition-transform hover:scale-110"
          style={{ opacity: feedback === "down" ? 0.3 : 1, color: feedback === "up" ? "#4ade80" : "#6b8a9a" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
        </button>
        <button
          onClick={() => setFeedback("down")}
          className="transition-transform hover:scale-110"
          style={{ opacity: feedback === "up" ? 0.3 : 1, color: feedback === "down" ? "#f87171" : "#6b8a9a" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function PrescriptionTab({ onGoExplain }: { onGoExplain: () => void }) {
  const [stage, setStage] = useState<"upload" | "review" | "results">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [imageBase64, setImageBase64] = useState("");
  const [imageMediaType, setImageMediaType] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [medicines, setMedicines] = useState<string[]>([]);
  const [handwritten, setHandwritten] = useState(false);
  const [language, setLanguage] = useState<Language>("hindi");
  const [newMedicine, setNewMedicine] = useState("");
  const [results, setResults] = useState<MedicineResult[]>([]);
  const [explaining, setExplaining] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setExtractError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setExtractError("Image too large. Maximum size is 10MB.");
      return;
    }

    setExtractError("");
    setExtracting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreviewUrl(dataUrl);

      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setImageMediaType(file.type);

      try {
        const res = await fetch("/api/prescription/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64, image_media_type: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed");

        setMedicines(data.medicines || []);
        setHandwritten(!!data.handwritten);
        setStage("review");
      } catch (err) {
        setExtractError(err instanceof Error ? err.message : "Could not read prescription.");
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const removeMedicine = (i: number) => setMedicines((prev) => prev.filter((_, idx) => idx !== i));

  const addMedicine = () => {
    const trimmed = newMedicine.trim();
    if (trimmed && !medicines.includes(trimmed)) {
      setMedicines((prev) => [...prev, trimmed]);
    }
    setNewMedicine("");
  };

  const handleExplainAll = async () => {
    if (medicines.length === 0) return;

    setExplaining(true);
    setResults(medicines.map((m) => ({ medicine: m, explanation: "", status: "loading" })));
    setStage("results");

    const res = await fetch("/api/prescription/explain-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicines, language }),
    });

    if (!res.ok || !res.body) {
      setResults((prev) => prev.map((r) => ({ ...r, status: "error" })));
      setExplaining(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "result") {
            setResults((prev) => {
              const next = [...prev];
              const idx = next.findIndex((r) => r.medicine === data.medicine);
              if (idx !== -1) next[idx] = { medicine: data.medicine, explanation: data.explanation, status: "done" };
              return next;
            });
          } else if (data.type === "error") {
            setResults((prev) => {
              const next = [...prev];
              const idx = next.findIndex((r) => r.medicine === data.medicine);
              if (idx !== -1) next[idx] = { ...next[idx], status: "error" };
              return next;
            });
          } else if (data.type === "done") {
            setExplaining(false);
          }
        } catch { /* skip malformed */ }
      }
    }

    setExplaining(false);
  };

  const retryOne = async (medicine: string) => {
    setResults((prev) => prev.map((r) => r.medicine === medicine ? { ...r, status: "loading", explanation: "" } : r));

    try {
      const res = await fetch("/api/prescription/explain-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicines: [medicine], language }),
      });
      if (!res.ok || !res.body) throw new Error("failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "result") {
              setResults((prev) => prev.map((r) => r.medicine === medicine ? { medicine, explanation: data.explanation, status: "done" } : r));
            } else if (data.type === "error") {
              setResults((prev) => prev.map((r) => r.medicine === medicine ? { ...r, status: "error" } : r));
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setResults((prev) => prev.map((r) => r.medicine === medicine ? { ...r, status: "error" } : r));
    }
  };

  const reset = () => {
    setStage("upload");
    setImageBase64("");
    setImageMediaType("");
    setImagePreviewUrl("");
    setMedicines([]);
    setResults([]);
    setExtractError("");
    setExtracting(false);
    setExplaining(false);
    setHandwritten(false);
    setNewMedicine("");
  };

  // ── Upload stage ──────────────────────────────────────────────────────────────
  if (stage === "upload") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-6 px-4">
        <div className="w-full max-w-[680px] flex flex-col gap-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all"
            style={{
              minHeight: 220,
              border: `2px dashed ${isDragging ? "rgba(251,226,167,0.6)" : "rgba(255,255,255,0.12)"}`,
              background: isDragging ? "rgba(251,226,167,0.04)" : "rgba(255,255,255,0.02)",
            }}
          >
            {extracting ? (
              <>
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full" style={{ border: "2px solid rgba(251,226,167,0.08)" }} />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                </div>
                <p className="text-sm" style={{ color: "#a8bec9" }}>Reading prescription...</p>
              </>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(251,226,167,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
                <div className="text-center">
                  <p className="font-semibold text-base" style={{ color: "#f0f8ff" }}>Upload your prescription</p>
                  <p className="text-xs mt-1" style={{ color: "#6b8a9a" }}>
                    Works with printed prescriptions · JPG / PNG / WebP · Max 10MB
                  </p>
                </div>
                <p className="text-xs" style={{ color: "rgba(251,226,167,0.5)" }}>
                  Click to browse or drag & drop
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {extractError && (
            <p className="text-xs text-center" style={{ color: "#f87171" }}>{extractError}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Review stage ──────────────────────────────────────────────────────────────
  if (stage === "review") {
    const tooFewMedicines = medicines.length < 2;

    return (
      <div className="flex-1 flex flex-col py-6 px-4 max-w-4xl mx-auto w-full gap-5">
        {/* Handwritten warning */}
        {handwritten && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}
          >
            <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span>Handwritten prescription detected — please verify medicine names below before explaining.</span>
          </div>
        )}

        {/* Too few medicines warning */}
        {tooFewMedicines && medicines.length === 0 && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}
          >
            <span>Could not read prescription medicines. Please type medicine names in the{" "}
              <button onClick={onGoExplain} className="underline underline-offset-2">Explain tab</button>.
            </span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Left: image preview */}
          <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)", minHeight: 280 }}>
            {imagePreviewUrl && (
              <img src={imagePreviewUrl} alt="prescription" className="w-full h-full object-contain max-h-72" />
            )}
          </div>

          {/* Right: chips + controls */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "#a8bec9" }}>
                {medicines.length > 0 ? `${medicines.length} medicine${medicines.length > 1 ? "s" : ""} found` : "No medicines found"}
                {medicines.length === 8 && <span className="ml-2" style={{ color: "#fbbf24" }}>(max 8 — first 8 shown)</span>}
              </p>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {medicines.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(251,226,167,0.08)", border: "1px solid rgba(251,226,167,0.2)", color: "#fbe2a7" }}
                  >
                    {m}
                    <button
                      onClick={() => removeMedicine(i)}
                      className="hover:opacity-60 transition-opacity"
                      style={{ color: "#fbe2a7", lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>

              {/* Add manually */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMedicine}
                  onChange={(e) => setNewMedicine(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMedicine()}
                  placeholder="Add medicine manually..."
                  className="flex-1 text-xs bg-transparent border-b py-1.5 focus:outline-none transition-colors"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "#f0f8ff" }}
                />
                <button
                  onClick={addMedicine}
                  disabled={!newMedicine.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: "rgba(251,226,167,0.1)", color: "#fbe2a7", border: "1px solid rgba(251,226,167,0.2)" }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Language selector */}
            <LanguageSelector selected={language} onChange={setLanguage} />

            {/* Explain All */}
            <button
              onClick={handleExplainAll}
              disabled={medicines.length === 0}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: medicines.length > 0 ? "rgba(74,222,128,0.15)" : "rgba(74,222,128,0.06)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}
            >
              Explain All {medicines.length > 0 ? `(${medicines.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Results stage ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col py-6 px-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-semibold" style={{ color: "#f0f8ff" }}>
          {results.filter((r) => r.status === "done").length} / {results.length} explained
        </p>
        <button
          onClick={reset}
          className="text-xs px-3 py-1.5 rounded-full border transition-all"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#a8bec9" }}
        >
          Upload new
        </button>
      </div>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {results.map((result) =>
          result.status === "loading" ? (
            <SkeletonCard key={result.medicine} medicine={result.medicine} />
          ) : (
            <ResultCard
              key={result.medicine}
              result={result}
              onRetry={() => retryOne(result.medicine)}
              onPharmacist={() => setShowComingSoon(true)}
            />
          )
        )}
      </div>

      {/* Footer actions */}
      {!explaining && (
        <div className="flex flex-col items-center gap-3 pb-4">
          <button
            onClick={() => setShowComingSoon(true)}
            className="flex items-center gap-2 text-sm transition-all"
            style={{ color: "#4ade80" }}
          >
            Still confused? Talk to a Pharmacist →
          </button>
          <button
            onClick={reset}
            className="text-xs underline underline-offset-2"
            style={{ color: "#6b8a9a" }}
          >
            Search another prescription
          </button>
        </div>
      )}

      {/* Coming soon modal */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowComingSoon(false)}>
          <div className="rounded-2xl p-8 max-w-sm w-full text-center" style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.08)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbe2a7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: "#f0f8ff" }}>Coming Soon</h3>
            <p className="text-sm mb-6" style={{ color: "#a8bec9" }}>
              Connect with a real pharmacist for personalised guidance. We&apos;re working on it!
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              className="px-6 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(251,226,167,0.12)", color: "#fbe2a7", border: "1px solid rgba(251,226,167,0.2)" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
