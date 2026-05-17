import { createFileRoute } from "@tanstack/react-router";

type ReadingPack = {
  reading_text: string;
  multiple_choice: { question: string; options: string[]; answer: number; explanation?: string }[];
  short_answer: { question: string; model_answer: string }[];
};

const LEVEL_NAMES: Record<number, string> = {
  0: "BEGINNER",
  1: "INTERMEDIATE",
  2: "ADVANCED",
};

function levelLabel(level: number): string {
  if (level <= 1) return "BEGINNER";
  if (level <= 3) return "INTERMEDIATE";
  return "ADVANCED";
}

function buildPrompt(opts: {
  language: string;
  level: number;
  interests: string;
  description: string;
  imageUrl?: string | null;
}): { system: string; user: string } {
  const levelName = LEVEL_NAMES[opts.level] ?? levelLabel(opts.level);
  const system = `You are an expert language curriculum designer. You craft tight, level-appropriate reading comprehension packets that adapt to the learner's own world.

Always respond with strict JSON ONLY (no markdown, no commentary) shaped exactly like:
{
  "reading_text": string,
  "multiple_choice": [
    { "question": string, "options": [string, string, string, string], "answer": number, "explanation": string }
  ],
  "short_answer": [
    { "question": string, "model_answer": string }
  ]
}

Rules:
- Exactly 3 multiple choice questions, 4 options each, "answer" is the 0-based correct index.
- Exactly 2 short answer questions, each with a 1-2 sentence "model_answer".
- Every field — passage, questions, options, model answers — must be written entirely in the target language. Never use English.
- Match the requested difficulty level strictly.`;

  const user = `Target language: ${opts.language || "Spanish"}
Difficulty level: ${levelName}
Learner interests: ${opts.interests || "daily life"}
Image the learner uploaded (description in their own words): "${opts.description}"
${opts.imageUrl ? `Image reference URL: ${opts.imageUrl}` : ""}

Write a short, vivid reading passage in ${opts.language} (about 120-200 words for ${levelName}) inspired by that scene. The passage should feel grounded in the learner's image — reuse concrete details from the description. Then build the 3 MCQ and 2 short-answer questions that test comprehension of the passage.

Return JSON ONLY.`;
  return { system, user };
}

async function callWafer(system: string, user: string): Promise<string> {
  const key = process.env.WAFER_API_KEY;
  if (!key) throw new Error("WAFER_API_KEY is not configured");

  const res = await fetch("https://pass.wafer.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "Qwen3.5-397B-A17B",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Wafer failed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

function normalize(raw: string): ReadingPack {
  let parsed: any = JSON.parse(raw);
  // Unwrap one level of nesting if the model wrapped output.
  if (!parsed.multiple_choice) {
    for (const v of Object.values(parsed)) {
      if (v && typeof v === "object" && (v as any).multiple_choice) {
        parsed = v;
        break;
      }
    }
  }
  const mcq = (parsed.multiple_choice ?? []).map((q: any) => ({
    question: String(q.question ?? ""),
    options: Array.isArray(q.options) ? q.options.map(String) : [],
    answer: typeof q.answer === "number" ? q.answer : Number(q.correct_answer ?? 0),
    explanation: q.explanation ? String(q.explanation) : undefined,
  }));
  const saq = (parsed.short_answer ?? []).map((q: any) => {
    if (typeof q === "string") return { question: q, model_answer: "" };
    return {
      question: String(q.question ?? ""),
      model_answer: String(q.model_answer ?? q.answer ?? ""),
    };
  });
  return {
    reading_text: String(parsed.reading_text ?? ""),
    multiple_choice: mcq,
    short_answer: saq,
  };
}

export const Route = createFileRoute("/api/reading-pack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            language?: string;
            level?: number;
            interests?: string;
            description?: string;
            image_url?: string | null;
          };
          const { system, user } = buildPrompt({
            language: body.language ?? "Spanish",
            level: body.level ?? 1,
            interests: body.interests ?? "",
            description: body.description ?? "",
            imageUrl: body.image_url ?? null,
          });
          const raw = await callWafer(system, user);
          const pack = normalize(raw);
          if (
            !pack.reading_text ||
            pack.multiple_choice.length < 3 ||
            pack.short_answer.length < 2
          ) {
            return Response.json(
              { error: "Generated pack is incomplete", raw },
              { status: 502 },
            );
          }
          return Response.json({ pack });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error";
          console.error("reading-pack error:", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
