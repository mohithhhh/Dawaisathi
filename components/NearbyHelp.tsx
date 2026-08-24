"use client";

import { useState, useEffect } from "react";

type Tab = "pharmacy" | "doctor" | "janaushadhi";
type Status = "idle" | "requesting" | "granted" | "denied";

const TAB_LABELS: Record<Tab, string> = {
  pharmacy: "Pharmacies",
  doctor: "Doctors",
  janaushadhi: "Jan Aushadhi",
};

const TAB_RESULT_LABELS: Record<Tab, string> = {
  pharmacy: "pharmacies",
  doctor: "doctors",
  janaushadhi: "Jan Aushadhi Kendras",
};

interface Place {
  name: string;
  rating: number | null;
  distance: string;
  open: boolean | null;
  mapsUrl: string;
}

export default function NearbyHelp() {
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [activeTab, setActiveTab] = useState<Tab>("pharmacy");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<Record<Tab, Place[] | null>>({ pharmacy: null, doctor: null, janaushadhi: null });
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.geolocation) {
      setSupported(false);
    }
  }, []);

  if (!supported) return null;

  const fetchResults = async (c: { lat: number; lng: number }, tab: Tab) => {
    if (results[tab] !== null) return;
    setFetching(true);
    try {
      const res = await fetch("/api/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: c.lat, lng: c.lng, type: tab }),
      });
      const data = await res.json();
      if (data.configured === false) {
        setSupported(false);
        return;
      }
      if (data.apiStatus) {
        console.error("[NearbyHelp] API error status:", data.apiStatus);
      }
      setResults((prev) => ({ ...prev, [tab]: data.results ?? [] }));
    } catch {
      setResults((prev) => ({ ...prev, [tab]: [] }));
    } finally {
      setFetching(false);
    }
  };

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    if (status === "idle") {
      setStatus("requesting");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(c);
          setStatus("granted");
          fetchResults(c, tab);
        },
        () => setStatus("denied")
      );
    } else if (status === "granted" && coords) {
      fetchResults(coords, tab);
    }
  };

  const tabLabel = TAB_RESULT_LABELS[activeTab];

  return (
    <div className="rounded-2xl p-4" style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8bec9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="text-sm font-medium" style={{ color: "#a8bec9" }}>Nearby Help</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        {(["pharmacy", "doctor", "janaushadhi"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              activeTab === tab
                ? { background: "rgba(251,226,167,0.14)", color: "#fbe2a7" }
                : { color: "#6b8a9a" }
            }
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* States */}
      {status === "idle" && (
        <p className="text-xs text-center py-2" style={{ color: "#6b8a9a" }}>
          Tap a tab to find nearby {tabLabel}
        </p>
      )}

      {status === "requesting" && (
        <div className="flex items-center justify-center gap-2 py-3">
          <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-xs" style={{ color: "#6b8a9a" }}>Getting your location...</p>
        </div>
      )}

      {status === "denied" && (
        <p className="text-xs text-center py-2" style={{ color: "#a8bec9" }}>
          Enable location to find nearby pharmacies and doctors
        </p>
      )}

      {status === "granted" && (
        <>
          {fetching && results[activeTab] === null ? (
            <div className="flex items-center justify-center gap-2 py-3">
              <span className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="text-xs" style={{ color: "#6b8a9a" }}>Finding nearby {tabLabel}...</p>
            </div>
          ) : results[activeTab]?.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "#6b8a9a" }}>
              No {tabLabel} found within {activeTab === "janaushadhi" ? "20" : "10"} km
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {results[activeTab]?.map((place, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "#f0f8ff" }}>{place.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs" style={{ color: "#6b8a9a" }}>{place.distance}</span>
                      {place.rating !== null && (
                        <span className="text-xs" style={{ color: "#fbe2a7" }}>★ {place.rating}</span>
                      )}
                      {place.open !== null && (
                        <span className="text-xs font-medium" style={{ color: place.open ? "#4ade80" : "#f87171" }}>
                          {place.open ? "Open" : "Closed"}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={place.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{
                      background: "rgba(251,226,167,0.08)",
                      color: "#fbe2a7",
                      border: "1px solid rgba(251,226,167,0.15)",
                    }}
                  >
                    Directions
                  </a>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
