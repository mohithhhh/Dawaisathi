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

export function buildExplainPrompt(medicineName: string): string {
  return `You are a medicine information assistant for Indian patients.

Medicine: ${medicineName}

First, on its own line, output the generic / active-ingredient name (this line is used internally for price lookup and is stripped before the patient sees anything — it is not part of the explanation):
GENERIC: <generic/active ingredient name only, no dosage, no brand name>
If you genuinely cannot determine it, write GENERIC: UNKNOWN

Then, after a blank line, explain this medicine in English using exactly this structure:

**What is this medicine?**
What condition this treats — one simple sentence.

**How to take it?**
When to take, how many times a day, before or after food.

**Important warning**
One critical thing — side effect, food to avoid, or storage.

**Other brand names**
2-3 Indian brand names for the same medicine.

Rules:
- Simple English, zero medical jargon
- Each section 2-3 sentences maximum
- Warm pharmacist tone
- Total under 150 words

Respond directly, no preamble.`;
}

function getKeys(): string[] {
  return (process.env.GOOGLE_API_KEY || "").split(",").map((k) => k.trim()).filter(Boolean);
}

// Tries each API key on 429 before waiting. With N keys and 3 wait rounds,
// makes up to N×4 attempts total before giving up.
export async function geminiPost(body: object, model = "gemini-2.5-flash"): Promise<Response> {
  const keys = getKeys();
  if (!keys.length) throw new Error("No Gemini API key configured");

  const waitMs = [2000, 8000, 20000];
  let lastRes!: Response;

  for (let round = 0; round <= waitMs.length; round++) {
    if (round > 0) await new Promise((r) => setTimeout(r, waitMs[round - 1]));
    for (const key of keys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (res.status !== 429) return res;
      lastRes = res;
    }
  }

  return lastRes;
}

export async function geminiExplain(medicineName: string): Promise<string> {
  const res = await geminiPost({
    contents: [{ parts: [{ text: buildExplainPrompt(medicineName) }] }],
    generationConfig: { maxOutputTokens: 800, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
  });
  if (!res.ok) throw new Error(`Gemini explain failed: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

// Pulls the leading "GENERIC: <name>" line back out of geminiExplain's raw
// output — see buildExplainPrompt. Returns the generic name (for Jan Aushadhi
// matching, see lib/janaushadhi.ts) and the explanation text with that line
// removed, ready to translate/display. Never throws: a missing or malformed
// GENERIC line just means no generic name, not a broken explanation.
export function extractGenericName(rawExplanation: string): {
  genericName: string | null;
  explanation: string;
} {
  const match = rawExplanation.match(/^GENERIC:\s*(.*?)\s*\n+/i);
  if (!match) return { genericName: null, explanation: rawExplanation.trim() };
  const generic = match[1].trim();
  const explanation = rawExplanation.slice(match[0].length).trim();
  return {
    genericName: generic && generic.toUpperCase() !== "UNKNOWN" ? generic : null,
    explanation,
  };
}

export async function geminiTranslate(text: string, targetLanguage: Language): Promise<string> {
  if (targetLanguage === "english") return text;
  const langName = LANGUAGE_NAMES[targetLanguage];
  const res = await geminiPost({
    contents: [{
      parts: [{
        text: `Translate this medicine explanation from English to ${langName}. Keep medicine brand names and drug names in English. Translate everything else including section headers. Output ONLY the translated text, no preamble:\n\n${text}`,
      }],
    }],
    generationConfig: { maxOutputTokens: 2000, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
  });
  if (!res.ok) throw new Error(`Translation failed: ${res.status}`);
  const data = await res.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!result) throw new Error("Empty translation response");
  return result;
}
