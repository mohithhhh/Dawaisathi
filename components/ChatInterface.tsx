"use client";

import { useState, useRef, useEffect } from "react";
import type { Language } from "@/types";
import LanguageSelector from "./LanguageSelector";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function ChatInterface({ language, onLanguageChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setError("");

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          language,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.slice(0, -1)); // remove empty assistant msg
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
          } catch {
            // skip malformed SSE
          }
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

  const clearChat = () => {
    setMessages([]);
    setError("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Language selector */}
      <LanguageSelector selected={language} onChange={onLanguageChange} disabled={isStreaming} />

      {/* Chat window */}
      <div className="bg-surface border border-border rounded-2xl flex flex-col" style={{ minHeight: "380px", maxHeight: "480px" }}>
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-text-secondary text-xs font-medium">Sarvam-M · Medicine Assistant</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-muted hover:text-text-secondary text-xs transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <span className="text-4xl mb-3">💬</span>
              <p className="text-text-secondary text-sm font-medium">Ask me about your medicine</p>
              <p className="text-muted text-xs mt-1">Dosage · Side effects · Interactions · Alternatives</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {["What is paracetamol used for?", "Can I take on empty stomach?", "What are the side effects?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:border-accent/40 hover:text-accent transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <span className="text-base mr-2 mt-0.5 shrink-0">💊</span>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-background rounded-tr-sm"
                    : "bg-surface-2 text-text-primary border border-border rounded-tl-sm"
                }`}
                style={
                  msg.role === "user"
                    ? { background: "linear-gradient(135deg, #fbe2a7 0%, #f0d090 100%)" }
                    : {}
                }
              >
                {msg.content || (
                  isStreaming && i === messages.length - 1 ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : null
                )}
                {msg.content && isStreaming && i === messages.length - 1 && (
                  <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex justify-center">
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-danger text-xs">⚠ {error}</span>
                <button onClick={() => setError("")} className="text-danger/60 hover:text-danger text-xs">✕</button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input row */}
        <div className="px-3 pb-3 pt-2 border-t border-border">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about dosage, side effects, interactions..."
              disabled={isStreaming}
              rows={1}
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none disabled:opacity-60"
              style={{ minHeight: "42px", maxHeight: "120px" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={
                input.trim() && !isStreaming
                  ? { background: "linear-gradient(135deg, #fbe2a7 0%, #f0d090 100%)", color: "#0d1c24" }
                  : { background: "#1a3040", color: "#6b8a9a" }
              }
            >
              {isStreaming ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-muted text-xs mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
