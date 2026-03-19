import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
}
