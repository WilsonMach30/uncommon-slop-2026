import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/api/judge-answer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            question?: string;
            model_answer?: string;
            user_answer?: string;
            passage?: string;
            language?: string;
          };
          const language = body.language ?? "Spanish";
          const system = `You are a strict but fair language tutor judging a short-answer comprehension response.
Return ONLY a JSON object of the form:
{
  "correct": boolean,
  "feedback": string,
  "improvement": string
}

- "correct": true if the learner's answer captures the key idea of the model answer (semantic match — minor grammar/spelling errors are OK), false otherwise.
- "feedback": one short sentence in English explaining what was right or wrong.
- "improvement": one short, concrete tip in English for how the learner could improve their ${language} answer next time.
Be concise. Never include extra fields. Never use markdown.`;

          const user = `Passage (excerpt): ${body.passage ?? "(not provided)"}
Question (${language}): ${body.question ?? ""}
Model answer (${language}): ${body.model_answer ?? ""}
Learner's answer: ${body.user_answer ?? ""}

Judge it. JSON only.`;

          const raw = await callWafer(system, user);
          let parsed: { correct?: boolean; feedback?: string; improvement?: string };
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { correct: false, feedback: "Could not parse judge response.", improvement: "" };
          }
          return Response.json({
            correct: Boolean(parsed.correct),
            feedback: String(parsed.feedback ?? ""),
            improvement: String(parsed.improvement ?? ""),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error";
          console.error("judge-answer error:", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
