"use client";

interface Props {
  genericName: string;
  unitSize: string;
  mrp: number;
}

export default function JanaushadhiMatch({ genericName, unitSize, mrp }: Props) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#12242e", border: "1px solid rgba(74,222,128,0.25)" }}>
      <div className="flex items-center gap-2 mb-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
        <span className="text-sm font-medium" style={{ color: "#4ade80" }}>Cheaper Generic Available</span>
        <span className="text-xs" style={{ color: "#6b8a9a" }}>· Jan Aushadhi</span>
      </div>

      <div className="rounded-xl p-3" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}>
        <p className="text-sm font-semibold" style={{ color: "#f0f8ff" }}>{genericName}</p>
        {unitSize && (
          <p className="text-xs mt-0.5" style={{ color: "#6b8a9a" }}>{unitSize}</p>
        )}
        <p className="text-lg font-bold mt-1.5" style={{ color: "#4ade80" }}>
          ₹{mrp.toFixed(2)}
          <span className="text-xs font-normal ml-1" style={{ color: "#6b8a9a" }}>govt. price</span>
        </p>
      </div>

      <p className="mt-3 text-xs" style={{ color: "#6b8a9a" }}>
        Same composition, government-approved generic — available at your nearest Jan Aushadhi Kendra. Tap "Nearby" below and check the Jan Aushadhi tab to find one.
      </p>
    </div>
  );
}
