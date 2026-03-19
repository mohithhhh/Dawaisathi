import { NextRequest, NextResponse } from "next/server";
import type { Language } from "@/types";

const LANGUAGE_NAMES: Record<Language, string> = {
  hindi: "Hindi",
  english: "English",
  bengali: "Bengali",
  gujarati: "Gujarati",
  kannada: "Kannada",
  malayalam: "Malayalam",
  marathi: "Marathi",
  odia: "Odia",
  punjabi: "Punjabi",
  tamil: "Tamil",
  telugu: "Telugu",
};

function buildExplainPrompt(medicineName: string): string {
  return `You are a helpful pharmacist explaining a medicine to a patient in India.
Explain the medicine "${medicineName}" in English with exactly this structure:

1. **Use**: One simple sentence about what this medicine treats
2. **How to take**: Timing, with/without food, typical dosage guidance
3. **Remember**: One important caution or side effect
4. **Other brand names**: 2-3 alternative brand names for the same medicine

Rules:
- Write entirely in clear, simple English
- Keep it under 150 words total
- Use simple, everyday language a patient can understand
- Use a warm, reassuring tone like a trusted pharmacist
- Do NOT use any HTML tags
- Brand names may stay in English

Respond directly with the explanation, no preamble.`;
}

async function geminiOCR(imageBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            {
              text: `You are reading a medicine packaging image (blister strip, tablet wrapper, bottle label, or box).
The image may be tilted, rotated, or photographed at an angle — read all text regardless of orientation.

Task: Extract the PRIMARY medicine name — the active pharmaceutical ingredient (generic name) or the most prominent brand name.

Rules:
- Ignore: batch numbers, expiry dates, MRP price, "Mfg by", dosage numbers (e.g. "500mg"), storage instructions
- Prefer the generic/active ingredient name if visible (e.g. "Paracetamol" over "Crocin")
- If multiple medicine names appear, return the most prominently printed one
- Return ONLY the medicine name — no units, no extra words, no punctuation
- If you truly cannot identify a medicine name, return UNKNOWN`,
            },
          ],
        }],
        generationConfig: { maxOutputTokens: 50, temperature: 0 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini OCR failed: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "UNKNOWN";
}

async function geminiExplain(medicineName: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildExplainPrompt(medicineName) }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini explain failed: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function sarvamTranslate(text: string, targetLanguage: Language): Promise<string> {
  if (targetLanguage === "english") return text;
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return text;

  const langName = LANGUAGE_NAMES[targetLanguage];
  const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sarvam-m",
      messages: [
        {
          role: "system",
          content: `You are a professional medical translator. Translate the following medicine explanation from English to ${langName}. Translate all text including section headers. Keep medicine names, drug names, and brand names in English. Output ONLY the translated text, no preamble.`,
        },
        { role: "user", content: text },
      ],
      max_completion_tokens: 700,
    }),
  });
  if (!res.ok) return text;
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
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

          const fullExplanation = await sarvamTranslate(englishExplanation, language);
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
