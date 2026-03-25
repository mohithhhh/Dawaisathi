"use client";

interface Props {
  medicineName: string;
}

const STORES = [
  {
    name: "1mg",
    url: (e: string) => `https://www.1mg.com/search/all?name=${e}`,
  },
  {
    name: "PharmEasy",
    url: (e: string) => `https://pharmeasy.in/search/all?name=${e}`,
  },
  {
    name: "Apollo",
    url: (e: string) => `https://www.apollopharmacy.in/search-medicines/${e}`,
  },
  {
    name: "Netmeds",
    url: (e: string) => `https://www.netmeds.com/catalogsearch/result?q=${e}`,
  },
];

export default function BuyMedicineLinks({ medicineName }: Props) {
  const encoded = encodeURIComponent(medicineName);

  return (
    <div className="rounded-2xl p-4" style={{ background: "#12242e", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2 mb-3">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8bec9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <span className="text-sm font-medium" style={{ color: "#a8bec9" }}>Order Online</span>
        <span className="text-xs" style={{ color: "#6b8a9a" }}>· Compare prices</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STORES.map((store) => (
          <a
            key={store.name}
            href={store.url(encoded)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center py-3 rounded-xl transition-all hover:opacity-80"
            style={{
              border: "1px solid rgba(251,226,167,0.3)",
              background: "rgba(251,226,167,0.04)",
            }}
          >
            <span className="text-sm font-semibold" style={{ color: "#fbe2a7" }}>{store.name}</span>
            <span className="text-xs mt-0.5" style={{ color: "rgba(251,226,167,0.5)" }}>₹ Check price</span>
          </a>
        ))}
      </div>

      <p className="mt-3 text-xs" style={{ color: "#6b8a9a" }}>
        Prices and availability may vary. Always buy from licensed pharmacies.
      </p>
    </div>
  );
}
