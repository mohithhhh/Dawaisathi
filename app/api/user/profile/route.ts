import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ user: null });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    // Auto-create profile if missing (e.g. first login)
    if (!userProfile) {
      const { data: newProfile } = await supabase
        .from("users")
        .insert({
          id: session.user.id,
          phone: session.user.phone || "",
          plan: "free",
          explanation_count: 0,
        })
        .select()
        .single();

      return NextResponse.json({ user: newProfile });
    }

    return NextResponse.json({ user: userProfile });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
