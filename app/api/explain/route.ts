import { NextRequest, NextResponse } from "next/server";
import type { Language } from "@/types";
import { geminiExplain, geminiTranslate, geminiPost } from "@/lib/ai";

async function geminiOCR(imageBase64: string, mimeType: string): Promise<string> {
  const DOSAGE_PATTERN = /\b\d+\s*(mg|ml|mcg|iu|g|%)\b|\b(tab\.?|cap\.?|syp\.?|inj\.?|oint\.?|susp\.?|tablet|capsule|syrup|injection|cream|drops?|patch|lotion)\b/gi;

  const cleanName = (s: string) =>
    s.replace(DOSAGE_PATTERN, "").replace(/\s+/g, " ").trim();

  const callGemini = async (promptText: string, temp = 0): Promise<string> => {
    const res = await geminiPost({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: promptText },
        ],
      }],
      generationConfig: { maxOutputTokens: 80, temperature: temp, thinkingConfig: { thinkingBudget: 0 } },
    });
    if (!res.ok) throw new Error(`Gemini OCR failed: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "UNKNOWN";
  };

  const primaryPrompt = `You are an expert at reading Indian medicine packaging — blister strips, tablet wrappers, bottle labels, syrup bottles, injection vials, and medicine boxes. The image may be blurry, tilted, rotated, or partially obscured.

Extract the medicine name using this priority:
1. The BRAND NAME printed most prominently (largest/boldest text) — e.g. "Crocin", "Dolo", "Augmentin", "Pan-D", "Combiflam"
2. If no clear brand name, extract the GENERIC/ACTIVE ingredient — e.g. "Paracetamol", "Metformin", "Omeprazole"

IGNORE completely: dosage numbers (500mg, 10ml), "Tablet"/"Capsule"/"Syrup", batch numbers, expiry dates, MRP/price, company/manufacturer names, addresses, storage instructions.

Return ONLY the medicine name — no dosage, no form suffix, no extra words.
Good examples: "Crocin" | "Paracetamol" | "Augmentin" | "Pan-D" | "Metformin" | "Pantoprazole"
Bad examples: "Crocin 650 Tablet" | "Tab. Augmentin 625" | "Paracetamol 500mg"

If you truly cannot read any medicine name, return exactly: UNKNOWN`;

  let result = cleanName(await callGemini(primaryPrompt, 0));

  if (!result || result.toUpperCase() === "UNKNOWN") {
    const fallback = cleanName(
      await callGemini(
        `What medicine is shown in this image? Read all text carefully — the package may be at an angle or partially blurry. Return only the medicine name (brand or generic). If you cannot determine the medicine name at all, return UNKNOWN.`,
        0.2
      )
    );
    if (fallback && fallback.toUpperCase() !== "UNKNOWN") return fallback;
  }

  return result || "UNKNOWN";
}

export async function POST(request: NextRequest) {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API not configured. Please add GOOGLE_API_KEY to your environment." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { medicine_name, language, image_base64, image_media_type }: {
      medicine_name?: string;
      language: Language;
      image_base64?: string;
      image_media_type?: string;
    } = body;

    let finalMedicineName = medicine_name;

    if (image_base64 && (!medicine_name || medicine_name.trim() === "")) {
      if (image_base64.length > 7_000_000) {
        return NextResponse.json(
          { error: "Image too large. Maximum size is 5MB." },
          { status: 400 }
        );
      }
      const mimeType = (image_media_type as string) || "image/jpeg";
      const extracted = await geminiOCR(image_base64, mimeType);
      if (!extracted || extracted === "UNKNOWN") {
        return NextResponse.json(
          { error: "Could not identify medicine from image. Please type the medicine name manually." },
          { status: 422 }
        );
      }
      finalMedicineName = extracted;
    }

    if (!finalMedicineName || finalMedicineName.trim() === "") {
      return NextResponse.json({ error: "Medicine name is required." }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        try {
          send(`data: ${JSON.stringify({ type: "medicine_name", medicine_name: finalMedicineName })}\n\n`);

          const englishExplanation = await geminiExplain(finalMedicineName!);
          if (!englishExplanation) {
            send(`data: ${JSON.stringify({ type: "error", error: "Could not generate explanation. Please try again." })}\n\n`);
            controller.close();
            return;
          }

          const fullExplanation = await geminiTranslate(englishExplanation, language);
          send(`data: ${JSON.stringify({ type: "text", text: fullExplanation })}\n\n`);
          send(`data: ${JSON.stringify({ type: "done", usage_count: null, plan: "free" })}\n\n`);
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          send(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Explain API error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}
