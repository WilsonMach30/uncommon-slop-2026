import { createFileRoute } from "@tanstack/react-router";

type Turn = { user?: string; assistant?: string };

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
  return data.choices?.[0]?.message?.content ?? "{}";
}

export const Route = createFileRoute("/api/voice-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            turns?: Turn[];
            language?: string;
            location?: string;
          };
          const turns = Array.isArray(body.turns) ? body.turns : [];
          const language = body.language || "Spanish";
          const location = body.location || "the tavern";

          const transcript = turns
            .map(
              (t, i) =>
                `Turn ${i + 1}\n  Learner: ${t.user ?? ""}\n  Innkeeper: ${t.assistant ?? ""}`,
            )
            .join("\n\n");

          const system = `You are a warm but rigorous ${language} speaking coach reviewing a short tavern roleplay between a learner and an AI innkeeper.

Return ONLY a JSON object with this exact shape:
{
  "score": number,                       // 0-100, overall speaking performance
  "summary": string,                     // 1-2 sentence overall feedback (English)
  "strengths": string[],                 // 2-3 concrete things the learner did well (English)
  "improvements": string[],              // 2-3 concrete things to work on (English)
  "model_phrasings": [
    { "learner_said": string, "better": string, "why": string }
  ]                                      // 2-3 entries; "better" is in ${language}, "why" is English
}

All feedback fields ("summary", "strengths", "improvements", "why") MUST be in English. Only "better" phrasings are in ${language}. Be concise, specific, and kind. No markdown.`;

          const user = `Setting: ${location}
Target language: ${language}

Conversation transcript:
${transcript || "(no turns recorded)"}

Judge the learner's ${language} speaking performance and return JSON only.`;

          const raw = await callWafer(system, user);
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = {};
          }

          return Response.json({
            feedback: {
              score: typeof parsed.score === "number" ? parsed.score : 0,
              summary: String(parsed.summary ?? ""),
              strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
              improvements: Array.isArray(parsed.improvements)
                ? parsed.improvements.map(String)
                : [],
              model_phrasings: Array.isArray(parsed.model_phrasings)
                ? parsed.model_phrasings.map((p: any) => ({
                    learner_said: String(p.learner_said ?? ""),
                    better: String(p.better ?? ""),
                    why: String(p.why ?? ""),
                  }))
                : [],
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error";
          console.error("voice-feedback error:", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
