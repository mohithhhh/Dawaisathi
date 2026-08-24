import { NextRequest, NextResponse } from "next/server";
import { geminiPost } from "@/lib/ai";

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { image_base64, image_media_type } = body;

  if (!image_base64) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  // ~10MB in base64
  if (image_base64.length > 13_500_000) {
    return NextResponse.json({ error: "Image too large. Maximum size is 10MB." }, { status: 400 });
  }

  const mimeType = image_media_type || "image/jpeg";

  const prompt = `This is an Indian medical prescription.

First determine: is this handwritten (true) or printed/typed (false)?

Then extract ONLY the medicine/drug names — generic or brand names (e.g. "Paracetamol", "Amoxicillin", "Pan-D", "Metformin").

Return ONLY valid JSON, nothing else:
{"handwritten": true/false, "medicines": ["medicine1", "medicine2"]}

Rules:
- Drug/medicine names only
- Ignore: doctor name, patient name, date, dosage (500mg, BD, OD, TDS), duration, diagnosis, lab tests
- Strip dosage suffixes — return "Paracetamol" not "Paracetamol 500mg"
- Maximum 8 medicines
- If no medicines found: {"handwritten": false, "medicines": []}`;

  try {
    const res = await geminiPost({
      contents: [{
        parts: [
          { inlineData: { mimeType, data: image_base64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      medicines: (Array.isArray(parsed.medicines) ? parsed.medicines : []).slice(0, 8),
      handwritten: !!parsed.handwritten,
    });
  } catch (error) {

    console.error("Prescription extract error:", error);
    return NextResponse.json(
      { error: "Failed to read prescription. Please try again." },
      { status: 500 }
    );
  }
}
