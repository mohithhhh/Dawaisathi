import { NextRequest, NextResponse } from "next/server";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false, results: [] });
  }

  const { lat, lng, type } = await request.json();
  if (!lat || !lng || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=${type}&key=${apiKey}`
  );
  const data = await res.json();
  console.log("[nearby] Places API status:", data.status, "| results:", data.results?.length ?? 0, "| error:", data.error_message ?? "none");

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[nearby] Places API error:", data.status, data.error_message);
    return NextResponse.json({ configured: true, results: [], apiStatus: data.status });
  }

  type PlaceResult = {
    name: string;
    rating?: number;
    vicinity?: string;
    opening_hours?: { open_now?: boolean };
    place_id: string;
    geometry: { location: { lat: number; lng: number } };
  };

  const results = ((data.results ?? []) as PlaceResult[]).slice(0, 3).map((place) => {
    const loc = place.geometry.location;
    const dist = haversineKm(lat, lng, loc.lat, loc.lng);
    return {
      name: place.name,
      rating: place.rating ?? null,
      distance: dist < 1 ? `${Math.round(dist * 1000)} m away` : `${dist.toFixed(1)} km away`,
      open: place.opening_hours?.open_now ?? null,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    };
  });

  return NextResponse.json({ configured: true, results });
}
