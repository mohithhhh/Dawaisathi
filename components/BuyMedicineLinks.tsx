"use client";

import { track } from "@/lib/posthog";

interface Props {
  medicineName: string;
}

// Per-store affiliate deep-link templates. Each network (1mg/PharmEasy run
// via Admitad or Impact, Apollo/Netmeds typically via vCommission) issues its
// own click-tracking URL format once you're approved — there's no universal
// "?aff_id=" param, so this can't be filled in without actually signing up
// for each program and copying the template they give you. Set the env var
// with `{url}` where the destination link should be substituted, e.g.:
//   NEXT_PUBLIC_AFFILIATE_URL_1MG="https://prf.hn/click/camref:xxxx/destination:{url}"
// Until each is set, that store falls back to a plain link with UTM params —
// so click-through is still visible in PostHog even before any affiliate
// deal exists, and turning on real monetization later is a config change,
// not a code change.
const AFFILIATE_TEMPLATES: Record<string, string | undefined> = {
  "1mg": process.env.NEXT_PUBLIC_AFFILIATE_URL_1MG,
  PharmEasy: process.env.NEXT_PUBLIC_AFFILIATE_URL_PHARMEASY,
  Apollo: process.env.NEXT_PUBLIC_AFFILIATE_URL_APOLLO,
  Netmeds: process.env.NEXT_PUBLIC_AFFILIATE_URL_NETMEDS,
};

const STORES = [
  {
    name: "1mg",
    plainUrl: (e: string) => `https://www.1mg.com/search/all?name=${e}&utm_source=dawaisathi&utm_medium=app&utm_campaign=order_online`,
  },
  {
    name: "PharmEasy",
    plainUrl: (e: string) => `https://pharmeasy.in/search/all?name=${e}&utm_source=dawaisathi&utm_medium=app&utm_campaign=order_online`,
  },
  {
    name: "Apollo",
    plainUrl: (e: string) => `https://www.apollopharmacy.in/search-medicines/${e}?utm_source=dawaisathi&utm_medium=app&utm_campaign=order_online`,
  },
  {
    name: "Netmeds",
    plainUrl: (e: string) => `https://www.netmeds.com/catalogsearch/result?q=${e}&utm_source=dawaisathi&utm_medium=app&utm_campaign=order_online`,
  },
];

function buildHref(storeName: string, plainUrl: string): { href: string; monetized: boolean } {
  const template = AFFILIATE_TEMPLATES[storeName];
  if (!template) return { href: plainUrl, monetized: false };
  return { href: template.replace("{url}", encodeURIComponent(plainUrl)), monetized: true };
}

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
        {STORES.map((store) => {
          const { href, monetized } = buildHref(store.name, store.plainUrl(encoded));
          return (
            <a
              key={store.name}
              href={href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => track("buy_link_clicked", { store: store.name, medicine: medicineName, monetized })}
              className="flex flex-col items-center py-3 rounded-xl transition-all hover:opacity-80"
              style={{
                border: "1px solid rgba(251,226,167,0.3)",
                background: "rgba(251,226,167,0.04)",
              }}
            >
              <span className="text-sm font-semibold" style={{ color: "#fbe2a7" }}>{store.name}</span>
              <span className="text-xs mt-0.5" style={{ color: "rgba(251,226,167,0.5)" }}>₹ Check price</span>
            </a>
          );
        })}
      </div>

      <p className="mt-3 text-xs" style={{ color: "#6b8a9a" }}>
        Prices and availability may vary. Always buy from licensed pharmacies.
      </p>
    </div>
  );
}
