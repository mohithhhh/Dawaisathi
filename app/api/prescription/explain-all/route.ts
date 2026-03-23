import { NextRequest, NextResponse } from "next/server";
import type { Language } from "@/types";
import { geminiExplain, geminiTranslate } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { medicines, language }: { medicines: string[]; language: Language } = body;

  if (!medicines?.length) {
    return NextResponse.json({ error: "No medicines provided" }, { status: 400 });
  }

  const list = medicines.slice(0, 8);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Process sequentially to avoid Gemini rate limits (max 2 concurrent calls)
      for (let index = 0; index < list.length; index++) {
        const medicine = list[index];
        try {
          const english = await geminiExplain(medicine);
          if (!english) throw new Error("empty explanation");
          const translated = await geminiTranslate(english, language);
          send({ type: "result", index, medicine, explanation: translated });
        } catch {
          send({ type: "error", index, medicine });
        }
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
