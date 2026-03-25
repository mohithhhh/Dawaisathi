"use client";

import { useState, useRef, useEffect } from "react";
import type { Language } from "@/types";
import BuyMedicineLinks from "@/components/BuyMedicineLinks";
import NearbyHelp from "@/components/NearbyHelp";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  language: Language;
  initialMessages?: Message[];
  medicineName?: string;
  onAskPharmacist?: () => void;
}

function renderContent(content: string) {
  return content.split("\n").map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={li} className={li > 0 && line.trim() ? "mt-2" : li > 0 ? "mt-0.5" : ""}>
        {parts.map((part, pi) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={pi} style={{ color: "#4ade80", fontWeight: 600 }}>
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={pi}>{part}</span>
          )
        )}
      </p>
    );
  });
}

const SUGGESTIONS = [
  "What is this medicine used for?",
  "Can I take this after food?",
  "What are the side effects?",
];

function AssistantAvatar() {
  return (
    <div
      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
      style={{
        background: "rgba(251,226,167,0.1)",
        color: "#fbe2a7",
        border: "1px solid rgba(251,226,167,0.15)",
        fontSize: "10px",
      }}
    >
      DS
    </div>
  );
}

export default function ChatInterface({ language, initialMessages = [], medicineName, onAskPharmacist }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showBuyLinks, setShowBuyLinks] = useState(false);
  const [showNearby, setShowNearby] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming) return;

    setInput("");
    setError("");

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, language }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.slice(0, -1));
        setError(data.error || "Something went wrong");
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Failed to read response");
        setIsStreaming(false);
        return;
      }

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
            if (data.type === "text") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: next[next.length - 1].content + data.text,
                };
                return next;
              });
            } else if (data.type === "error") {
              setError(data.error);
              setMessages((prev) => prev.slice(0, -1));
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;
  const hasFollowUps = messages.length > initialMessages.length;

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: "500px" }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center text-center h-full py-16 px-4" style={{ minHeight: "400px" }}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold mb-4"
              style={{
                background: "rgba(251,226,167,0.1)",
                color: "#fbe2a7",
                border: "1px solid rgba(251,226,167,0.2)",
                fontSize: "11px",
                letterSpacing: "0.05em",
              }}
            >
              DS
            </div>
            <p className="font-medium mb-1" style={{ color: "rgba(255,255,255,0.85)", fontSize: "15px" }}>DawaiSathi</p>
            <p className="mb-7" style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>
              Ask me anything about your medicine
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.45)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(251,226,167,0.35)";
                    e.currentTarget.style.color = "#fbe2a7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div ref={bottomRef} />
          </div>
        ) : (
          /* Messages list */
          <div className="flex flex-col gap-6 py-6 px-1">
            {messages.map((msg, i) =>
              msg.role === "assistant" ? (
                <div key={i} className="flex items-start gap-3">
                  <AssistantAvatar />
                  <div
                    className="flex-1 min-w-0 font-devanagari"
                    style={{ color: "rgba(255,255,255,0.9)", fontSize: "15px", lineHeight: "1.7" }}
                  >
                    {msg.content ? (
                      <>
                        {renderContent(msg.content)}
                        {isStreaming && i === messages.length - 1 && (
                          <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
                        )}
                      </>
                    ) : isStreaming && i === messages.length - 1 ? (
                      <span className="flex items-center gap-1 py-1">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background: "rgba(255,255,255,0.3)", animationDelay: `${d}ms` }}
                          />
                        ))}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div
                    className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "14px",
                      lineHeight: "1.55",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Nearby inline — shown when toggled */}
      {showNearby && (
        <div className="pt-2 pb-1">
          <NearbyHelp />
        </div>
      )}

      {/* Buy links inline — shown when toggled */}
      {showBuyLinks && medicineName && (
        <div className="pb-1">
          <BuyMedicineLinks medicineName={medicineName} />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex justify-center pb-2 px-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "#f87171",
            }}
          >
            {error}
            <button onClick={() => setError("")} style={{ color: "rgba(248,113,113,0.5)" }}>✕</button>
          </div>
        </div>
      )}

      {/* Reset link */}
      {hasFollowUps && (
        <div className="flex justify-center pb-1">
          <button
            onClick={() => { setMessages(initialMessages); setError(""); }}
            className="text-xs transition-colors"
            style={{ color: "rgba(255,255,255,0.22)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.22)"; }}
          >
            Reset conversation
          </button>
        </div>
      )}

      {/* Buy medicine + Nearby + Ask a pharmacist — floating action row */}
      {!isEmpty && (medicineName || onAskPharmacist) && (
        <div className="flex justify-center gap-2 pb-2 pt-1 flex-wrap">
          {medicineName && (
            <button
              onClick={() => setShowBuyLinks((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full transition-all"
              style={{
                background: showBuyLinks ? "rgba(251,226,167,0.14)" : "rgba(251,226,167,0.07)",
                border: "1px solid rgba(251,226,167,0.25)",
                color: "#fbe2a7",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(251,226,167,0.14)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = showBuyLinks ? "rgba(251,226,167,0.14)" : "rgba(251,226,167,0.07)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Order online
            </button>
          )}
          <button
            onClick={() => setShowNearby((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full transition-all"
            style={{
              background: showNearby ? "rgba(168,190,201,0.14)" : "rgba(168,190,201,0.07)",
              border: "1px solid rgba(168,190,201,0.25)",
              color: "#a8bec9",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,190,201,0.14)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showNearby ? "rgba(168,190,201,0.14)" : "rgba(168,190,201,0.07)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Nearby
          </button>
          {onAskPharmacist && (
            <button
              onClick={() => setShowComingSoon(true)}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full transition-all"
              style={{
                background: "rgba(74,222,128,0.07)",
                border: "1px solid rgba(74,222,128,0.2)",
                color: "#4ade80",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.13)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.07)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Ask a pharmacist
            </button>
          )}
        </div>
      )}

      {/* Coming Soon modal */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowComingSoon(false)}>
          <div className="rounded-2xl p-8 max-w-sm w-full text-center" style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.08)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fbe2a7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
            </div>
            <h3 className="font-bold text-lg mb-2" style={{ color: "#f0f8ff" }}>Coming Soon</h3>
            <p className="text-sm mb-6" style={{ color: "#a8bec9" }}>
              Connect with a real pharmacist for personalised guidance. We're working on it!
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

      {/* Input area */}
      <div className="pt-3 pb-1">
        <div
          className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your medicine..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 bg-transparent focus:outline-none resize-none disabled:opacity-60"
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "14px",
              lineHeight: "1.5",
              minHeight: "24px",
              maxHeight: "120px",
            }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={
              input.trim() && !isStreaming
                ? { background: "#fbe2a7", color: "#0d1c24" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }
            }
          >
            {isStreaming ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-center mt-2 text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
