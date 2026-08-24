"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PharmacistProfile {
  id: string;
  full_name: string | null;
  languages: string[];
  is_available: boolean;
}

interface CallbackRequest {
  id: string;
  patient_id: string;
  patient_phone: string | null;
  medicine_name: string;
  language: string;
  explanation: string | null;
  status: "pending" | "accepted" | "completed" | "cancelled";
  pharmacist_id: string | null;
  created_at: string;
  accepted_at: string | null;
  called_at: string | null;
}

interface ChatMessage {
  id: string;
  callback_request_id: string;
  sender_id: string;
  sender_role: "patient" | "pharmacist";
  message: string;
  created_at: string;
}

type Tab = "requests" | "chats" | "history";

// ─── Module-level constants ───────────────────────────────────────────────────

const DASHBOARD_TITLE = "DawaiSathi · Pharmacist";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // AudioContext blocked (e.g. before user gesture) — silent fallback
  }
}

function maskPhone(phone: string | null): string {
  if (!phone) return "Unknown";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) return `+91 ••••••${digits.slice(-4)}`;
  return phone;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown({ acceptedAt }: { acceptedAt: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const elapsed = (Date.now() - new Date(acceptedAt).getTime()) / 1000;
      setRemaining(Math.max(0, 15 * 60 - elapsed));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [acceptedAt]);

  if (remaining <= 0)
    return <span style={{ color: "#f87171" }} className="text-xs">Time up</span>;
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  return (
    <span
      className="text-xs font-mono"
      style={{ color: remaining < 3 * 60 ? "#f87171" : "#fbe2a7" }}
    >
      {m}:{s.toString().padStart(2, "0")} left
    </span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  profile,
  isAvailable,
  onToggleAvailability,
  activeTab,
  onTabChange,
  pendingCount,
  activeCount,
  onLogout,
}: {
  profile: PharmacistProfile;
  isAvailable: boolean;
  onToggleAvailability: (v: boolean) => void;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  pendingCount: number;
  activeCount: number;
  onLogout: () => void;
}) {
  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    {
      id: "requests",
      label: "Requests",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: "chats",
      label: "Active Chats",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "history",
      label: "History",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="flex flex-col h-full py-5 px-3 shrink-0"
      style={{
        width: "240px",
        background: "#0a1820",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Brand */}
      <div className="px-2 mb-5">
        <div className="text-sm font-semibold" style={{ color: "#f0f8ff" }}>DawaiSathi</div>
        <div className="text-xs mt-0.5" style={{ color: "#6b8a9a" }}>Pharmacist Portal</div>
      </div>

      {/* Profile card */}
      <div
        className="rounded-xl p-3 mb-4"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="text-sm font-medium" style={{ color: "#f0f8ff" }}>
          {profile.full_name || "Pharmacist"}
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {profile.languages.map((lang) => (
            <span
              key={lang}
              className="text-xs px-1.5 py-0.5 rounded-md"
              style={{ background: "rgba(251,226,167,0.1)", color: "#fbe2a7" }}
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="px-1 mb-4">
        <div className="text-xs font-medium mb-2 px-1" style={{ color: "#4a6a7a" }}>AVAILABILITY</div>
        <button
          onClick={() => onToggleAvailability(!isAvailable)}
          className="flex items-center gap-2 w-full py-2 px-3 rounded-xl transition-all"
          style={{
            background: isAvailable ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
            border: isAvailable
              ? "1px solid rgba(74,222,128,0.25)"
              : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: isAvailable ? "#4ade80" : "#4a6a7a" }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: isAvailable ? "#4ade80" : "#6b8a9a" }}
          >
            {isAvailable ? "Online" : "Offline"}
          </span>
        </button>
        {!isAvailable && (
          <p className="text-xs mt-1.5 px-1" style={{ color: "#4a6a7a" }}>
            Patients cannot reach you
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="px-1 mb-1">
        <div className="text-xs font-medium mb-2 px-1" style={{ color: "#4a6a7a" }}>NAVIGATION</div>
      </div>
      <div className="flex flex-col gap-0.5">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all"
            style={
              activeTab === id
                ? { background: "rgba(251,226,167,0.08)", color: "#fbe2a7" }
                : { color: "#a8bec9" }
            }
          >
            <span className="flex items-center gap-2">
              {icon}
              {label}
            </span>
            {id === "requests" && pendingCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center"
                style={{ background: "rgba(251,226,167,0.15)", color: "#fbe2a7" }}
              >
                {pendingCount}
              </span>
            )}
            {id === "chats" && activeCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[20px] text-center"
                style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}
              >
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors"
        style={{ color: "#4a6a7a" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#4a6a7a"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Logout
      </button>
    </div>
  );
}

// ─── RequestCard ──────────────────────────────────────────────────────────────

function RequestCard({
  req,
  onAccept,
  onSkip,
}: {
  req: CallbackRequest;
  onAccept: (id: string) => Promise<void>;
  onSkip: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [accepting, setAccepting] = useState(false);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: "#6b8a9a" }}>{timeAgo(req.created_at)}</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(251,226,167,0.08)", color: "#fbe2a7" }}
          >
            {req.language}
          </span>
        </div>
        <div className="text-sm font-semibold mt-1" style={{ color: "#f0f8ff" }}>
          {req.medicine_name}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "#6b8a9a" }}>
          Patient: {maskPhone(req.patient_phone)}
        </div>
      </div>

      {req.explanation && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs"
            style={{ color: "#a8bec9" }}
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {expanded ? "Hide" : "View"} AI Explanation
          </button>
          {expanded && (
            <div
              className="mt-2 p-3 rounded-xl text-xs leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.03)",
                color: "#a8bec9",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {req.explanation}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={async () => {
            setAccepting(true);
            await onAccept(req.id);
            setAccepting(false);
          }}
          disabled={accepting}
          className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.2)",
            color: "#4ade80",
            opacity: accepting ? 0.6 : 1,
          }}
        >
          {accepting ? "Accepting..." : "Accept & Call"}
        </button>
        <button
          onClick={() => onSkip(req.id)}
          className="px-4 py-2 rounded-xl text-sm transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#6b8a9a",
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ─── RequestsTab ──────────────────────────────────────────────────────────────

function RequestsTab({
  requests,
  skippedIds,
  onAccept,
  onSkip,
}: {
  requests: CallbackRequest[];
  skippedIds: Set<string>;
  onAccept: (id: string) => Promise<void>;
  onSkip: (id: string) => void;
}) {
  const visible = requests.filter((r) => !skippedIds.has(r.id));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-base font-semibold mb-4" style={{ color: "#f0f8ff" }}>
        Pending Requests
        {visible.length > 0 && (
          <span className="ml-2 text-sm font-normal" style={{ color: "#6b8a9a" }}>
            ({visible.length})
          </span>
        )}
      </h2>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e3a4a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-sm" style={{ color: "#6b8a9a" }}>No pending requests</p>
          <p className="text-xs text-center" style={{ color: "#4a6a7a" }}>
            New requests will appear here in real-time
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-xl">
          {visible.map((req) => (
            <RequestCard key={req.id} req={req} onAccept={onAccept} onSkip={onSkip} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ChatWindow ───────────────────────────────────────────────────────────────

function ChatWindow({
  request,
  messages,
  currentUserId,
  onSend,
  onComplete,
}: {
  request: CallbackRequest;
  messages: ChatMessage[];
  currentUserId: string;
  onSend: (requestId: string, message: string) => void;
  onComplete: (requestId: string) => void;
}) {
  const [input, setInput] = useState("");
  const [explanationOpen, setExplanationOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    onSend(request.id, text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Context bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: "#f0f8ff" }}>
            {request.medicine_name}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: "#a8bec9" }}>
              {request.patient_phone || maskPhone(null)}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(251,226,167,0.08)", color: "#fbe2a7" }}
            >
              {request.language}
            </span>
            {request.accepted_at && <Countdown acceptedAt={request.accepted_at} />}
          </div>
        </div>
        <button
          onClick={() => onComplete(request.id)}
          className="text-xs px-3 py-1.5 rounded-xl transition-all shrink-0"
          style={{
            background: "rgba(74,222,128,0.07)",
            border: "1px solid rgba(74,222,128,0.2)",
            color: "#4ade80",
          }}
        >
          ✓ Mark Completed
        </button>
      </div>

      {/* AI explanation collapsible */}
      {request.explanation && (
        <div
          className="mx-4 mt-3 rounded-xl overflow-hidden shrink-0"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={() => setExplanationOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs"
            style={{ background: "rgba(255,255,255,0.03)", color: "#a8bec9" }}
          >
            <span>AI Explanation sent to patient</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{
                transform: explanationOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {explanationOpen && (
            <div
              className="px-3 pb-3 pt-2 text-xs leading-relaxed"
              style={{ background: "rgba(255,255,255,0.02)", color: "#a8bec9" }}
            >
              {request.explanation}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs" style={{ color: "#4a6a7a" }}>No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] px-3 py-2 rounded-2xl text-sm"
                style={
                  isMe
                    ? {
                        background: "rgba(74,222,128,0.1)",
                        color: "#f0f8ff",
                        borderBottomRightRadius: "4px",
                      }
                    : {
                        background: "rgba(255,255,255,0.06)",
                        color: "#f0f8ff",
                        borderBottomLeftRadius: "4px",
                      }
                }
              >
                <div>{msg.message}</div>
                <div className="text-xs mt-1 opacity-50">{fmtTime(msg.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f0f8ff",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: input.trim() ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)",
              border: input.trim()
                ? "1px solid rgba(74,222,128,0.25)"
                : "1px solid rgba(255,255,255,0.08)",
              color: input.trim() ? "#4ade80" : "#6b8a9a",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ActiveChatsTab ───────────────────────────────────────────────────────────

function ActiveChatsTab({
  activeRequests,
  selectedId,
  onSelectChat,
  messages,
  currentUserId,
  onSend,
  onComplete,
}: {
  activeRequests: CallbackRequest[];
  selectedId: string | null;
  onSelectChat: (id: string) => void;
  messages: ChatMessage[];
  currentUserId: string;
  onSend: (requestId: string, message: string) => void;
  onComplete: (requestId: string) => void;
}) {
  const selected = activeRequests.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Chat list */}
      <div
        className="shrink-0 flex flex-col overflow-y-auto"
        style={{ width: "260px", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="p-4 pb-2 text-sm font-semibold" style={{ color: "#f0f8ff" }}>
          Active Chats
          {activeRequests.length > 0 && (
            <span className="ml-1.5 text-xs font-normal" style={{ color: "#6b8a9a" }}>
              ({activeRequests.length})
            </span>
          )}
        </div>

        {activeRequests.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-center" style={{ color: "#6b8a9a" }}>
              No active chats. Accept a request to start.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-2 pb-4">
            {activeRequests.map((req) => (
              <button
                key={req.id}
                onClick={() => onSelectChat(req.id)}
                className="flex flex-col text-left px-3 py-2.5 rounded-xl transition-all"
                style={
                  selectedId === req.id
                    ? {
                        background: "rgba(251,226,167,0.07)",
                        border: "1px solid rgba(251,226,167,0.15)",
                      }
                    : { border: "1px solid transparent" }
                }
              >
                <div className="text-sm font-medium truncate" style={{ color: "#f0f8ff" }}>
                  {req.medicine_name}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#6b8a9a" }}>
                  {maskPhone(req.patient_phone)} · {req.language}
                </div>
                {req.accepted_at && (
                  <div className="mt-1">
                    <Countdown acceptedAt={req.accepted_at} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selected ? (
          <ChatWindow
            request={selected}
            messages={messages}
            currentUserId={currentUserId}
            onSend={onSend}
            onComplete={onComplete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: "#6b8a9a" }}>
              {activeRequests.length === 0
                ? "No active chats yet"
                : "Select a chat to start messaging"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HistoryTab ───────────────────────────────────────────────────────────────

function HistoryTab({ history }: { history: CallbackRequest[] }) {
  const now = Date.now();
  const thisWeek = history.filter(
    (r) => now - new Date(r.created_at).getTime() < 7 * 24 * 3600 * 1000
  );
  const thisMonth = history.filter(
    (r) => now - new Date(r.created_at).getTime() < 30 * 24 * 3600 * 1000
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-base font-semibold mb-4" style={{ color: "#f0f8ff" }}>History</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg">
        {[
          { label: "This week", value: thisWeek.length },
          { label: "This month", value: thisMonth.length },
          { label: "All time", value: history.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 text-center"
            style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="text-2xl font-semibold" style={{ color: "#fbe2a7" }}>
              {stat.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "#6b8a9a" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm" style={{ color: "#6b8a9a" }}>No completed calls yet</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden max-w-3xl"
          style={{ border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {["Date", "Medicine", "Language", "Status"].map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-3 text-xs font-medium"
                    style={{ color: "#6b8a9a" }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((req, i) => (
                <tr
                  key={req.id}
                  style={{
                    borderBottom:
                      i < history.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    background: i % 2 !== 0 ? "rgba(255,255,255,0.01)" : "transparent",
                  }}
                >
                  <td className="px-4 py-3 text-xs" style={{ color: "#a8bec9" }}>
                    {new Date(req.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "#f0f8ff" }}>
                    {req.medicine_name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#a8bec9" }}>
                    {req.language}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          req.status === "completed"
                            ? "rgba(74,222,128,0.1)"
                            : "rgba(107,138,154,0.1)",
                        color: req.status === "completed" ? "#4ade80" : "#6b8a9a",
                      }}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PharmacistDashboard ──────────────────────────────────────────────────────

export default function PharmacistDashboard() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PharmacistProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAvailable, setIsAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("requests");

  const [pendingRequests, setPendingRequests] = useState<CallbackRequest[]>([]);
  const [activeRequests, setActiveRequests] = useState<CallbackRequest[]>([]);
  const [history, setHistory] = useState<CallbackRequest[]>([]);

  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const titleFlashRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tab title flash
  const flashTitle = useCallback(() => {
    if (titleFlashRef.current) return;
    let flag = false;
    titleFlashRef.current = setInterval(() => {
      document.title = flag ? "New Request! · DawaiSathi" : DASHBOARD_TITLE;
      flag = !flag;
    }, 1000);
    setTimeout(() => {
      if (titleFlashRef.current) {
        clearInterval(titleFlashRef.current);
        titleFlashRef.current = null;
        document.title = DASHBOARD_TITLE;
      }
    }, 10000);
  }, []);

  useEffect(() => {
    document.title = DASHBOARD_TITLE;
    const stopFlash = () => {
      if (titleFlashRef.current) {
        clearInterval(titleFlashRef.current);
        titleFlashRef.current = null;
        document.title = DASHBOARD_TITLE;
      }
    };
    window.addEventListener("focus", stopFlash);
    return () => {
      window.removeEventListener("focus", stopFlash);
      stopFlash();
    };
  }, []);

  // Load user + profile via onAuthStateChange (works with localStorage sessions)
  useEffect(() => {
    const loadProfile = async (uid: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, languages, is_available")
        .eq("id", uid)
        .single();
      if (data) {
        setProfile(data);
        setIsAvailable(data.is_available);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      }
    );

    return () => { subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load requests + history when profile is ready
  useEffect(() => {
    if (!profile?.id) return;

    const loadRequests = async () => {
      const [{ data: pending }, { data: active }] = await Promise.all([
        supabase
          .from("callback_requests")
          .select("*")
          .eq("status", "pending")
          .in("language", profile.languages)
          .order("created_at", { ascending: false }),
        supabase
          .from("callback_requests")
          .select("*")
          .eq("status", "accepted")
          .eq("pharmacist_id", profile.id)
          .order("created_at", { ascending: false }),
      ]);
      if (pending) setPendingRequests(pending);
      if (active) setActiveRequests(active);
    };

    loadRequests();
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: new callback_requests
  useEffect(() => {
    if (!profile?.id) return;
    const languages = profile.languages;

    const channel = supabase
      .channel("new_requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "callback_requests" },
        (payload) => {
          const req = payload.new as CallbackRequest;
          if (languages.includes(req.language)) {
            setPendingRequests((prev) => [req, ...prev]);
            playNotificationSound();
            flashTitle();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, flashTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load + subscribe to chat messages when selectedChatId changes
  useEffect(() => {
    if (!selectedChatId) {
      setChatMessages([]);
      return;
    }

    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    const loadAndSubscribe = async () => {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("callback_request_id", selectedChatId)
        .order("created_at", { ascending: true });
      if (data) setChatMessages(data);

      channelRef = supabase
        .channel(`chat_${selectedChatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chats",
            filter: `callback_request_id=eq.${selectedChatId}`,
          },
          (payload) => {
            setChatMessages((prev) => [...prev, payload.new as ChatMessage]);
          }
        )
        .subscribe();
    };

    loadAndSubscribe();
    return () => { if (channelRef) supabase.removeChannel(channelRef); };
  }, [selectedChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleAvailability = async (val: boolean) => {
    if (!user) return;
    setIsAvailable(val);
    await supabase.from("profiles").update({ is_available: val }).eq("id", user.id);
  };

  const handleAccept = async (requestId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("callback_requests")
      .update({ status: "accepted", pharmacist_id: user.id, accepted_at: now })
      .eq("id", requestId);

    if (!error) {
      const req = pendingRequests.find((r) => r.id === requestId);
      if (req) {
        const updated: CallbackRequest = {
          ...req,
          status: "accepted",
          pharmacist_id: user.id,
          accepted_at: now,
        };
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        setActiveRequests((prev) => [updated, ...prev]);
        setSelectedChatId(requestId);
        setActiveTab("chats");
      }
    }
  };

  const handleSkip = (requestId: string) => {
    setSkippedIds((prev) => { const next = new Set(Array.from(prev)); next.add(requestId); return next; });
  };

  const handleSendMessage = async (requestId: string, message: string) => {
    if (!user) return;
    await supabase.from("chats").insert({
      callback_request_id: requestId,
      sender_id: user.id,
      sender_role: "pharmacist",
      message,
    });
  };

  const handleComplete = async (requestId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("callback_requests")
      .update({ status: "completed", called_at: now })
      .eq("id", requestId);

    if (!error) {
      const req = activeRequests.find((r) => r.id === requestId);
      if (req) {
        setActiveRequests((prev) => prev.filter((r) => r.id !== requestId));
        setHistory((prev) => [{ ...req, status: "completed", called_at: now }, ...prev]);
        if (selectedChatId === requestId) setSelectedChatId(null);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "history" && profile?.id) {
      supabase
        .from("callback_requests")
        .select("*")
        .eq("pharmacist_id", profile.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .then(({ data }) => { if (data) setHistory(data); });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1c24" }}>
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(251,226,167,0.2)", borderTopColor: "#fbe2a7" }}
        />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1c24" }}>
        <div className="text-center">
          <p className="text-sm" style={{ color: "#a8bec9" }}>
            Access denied. Sign in as a pharmacist to continue.
          </p>
          <a href="/" className="text-sm mt-3 block" style={{ color: "#fbe2a7" }}>
            ← Go home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0d1c24", color: "#f0f8ff" }}>
      {/* Mobile fallback */}
      <div className="flex md:hidden items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <p className="text-sm" style={{ color: "#a8bec9" }}>
            The pharmacist dashboard is designed for desktop use.
          </p>
          <p className="text-xs mt-1" style={{ color: "#6b8a9a" }}>
            Please open on a larger screen.
          </p>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <Sidebar
          profile={profile}
          isAvailable={isAvailable}
          onToggleAvailability={handleToggleAvailability}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingCount={pendingRequests.filter((r) => !skippedIds.has(r.id)).length}
          activeCount={activeRequests.length}
          onLogout={handleLogout}
        />

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "requests" && (
            <RequestsTab
              requests={pendingRequests}
              skippedIds={skippedIds}
              onAccept={handleAccept}
              onSkip={handleSkip}
            />
          )}
          {activeTab === "chats" && (
            <ActiveChatsTab
              activeRequests={activeRequests}
              selectedId={selectedChatId}
              onSelectChat={(id) => {
                setSelectedChatId(id);
                setChatMessages([]);
              }}
              messages={chatMessages}
              currentUserId={user.id}
              onSend={handleSendMessage}
              onComplete={handleComplete}
            />
          )}
          {activeTab === "history" && <HistoryTab history={history} />}
        </div>
      </div>
    </div>
  );
}
