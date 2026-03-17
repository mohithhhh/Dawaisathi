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

function buildSystemPrompt(language: Language): string {
  const lang = LANGUAGE_NAMES[language];
  return `You are a friendly and knowledgeable medicine assistant for Indian patients. Your job is to help patients understand their medicines in simple, everyday language.

You MUST:
- Answer ONLY medicine-related questions (dosage, side effects, drug interactions, storage, alternatives, what a medicine treats, when to take it, precautions).
- Respond entirely in ${lang}. Every word of your response must be in ${lang} — do not mix languages.
- Keep answers short, warm, and easy for a non-medical person to understand.
- If a medicine name appears in the conversation, use it as context for follow-up questions.

You MUST NOT:
- Answer questions unrelated to medicines or health.
- Give advice that replaces a doctor's consultation for serious conditions.
- Diagnose diseases.

If asked an unrelated question, politely refuse in ${lang} and redirect to medicine questions.`;
}

export async function POST(request: NextRequest) {
  const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

  if (!SARVAM_API_KEY) {
    return NextResponse.json(
      { error: "Chat not configured. Please add SARVAM_API_KEY to your environment." },
      { status: 503 }
    );
  }

  let body: { messages: { role: string; content: string }[]; language: Language };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, language = "english" } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  const systemMessage = { role: "system", content: buildSystemPrompt(language) };
  const fullMessages = [systemMessage, ...messages];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SARVAM_API_KEY}`,
          },
          body: JSON.stringify({
            model: "sarvam-m",
            messages: fullMessages,
            stream: true,
            max_completion_tokens: 512,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          send(`data: ${JSON.stringify({ type: "error", error: `Sarvam API error: ${res.status}` })}\n\n`);
          console.error("Sarvam API error:", res.status, errText);
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          send(`data: ${JSON.stringify({ type: "error", error: "No response stream" })}\n\n`);
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const json = JSON.parse(trimmed.slice(6));
              const text = json.choices?.[0]?.delta?.content;
              if (text) {
                send(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
              }
              if (json.choices?.[0]?.finish_reason === "stop") {
                send(`data: ${JSON.stringify({ type: "done" })}\n\n`);
              }
            } catch {
              // skip malformed chunk
            }
          }
        }

        send(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Network error";
        send(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
      } finally {
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
}
