import { createFileRoute } from "@tanstack/react-router";

const ELEVEN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — warm innkeeper

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function transcribe(audio: Blob, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, "recording.webm");
  form.append("model_id", "scribe_v2");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!res.ok) throw new Error(`STT failed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

function buildSystem(location: string, language: string, description: string, imageUrl: string | null): string {
  const target = language || "the target language";
  return `You are an in-character innkeeper in a fantasy tavern in "${location}".
You are helping the traveler practice ${target} through natural conversation.

CRITICAL LANGUAGE RULE:
- You MUST speak ENTIRELY in ${target}. Every single word of your reply must be in ${target}.
- Do NOT use English (unless ${target} IS English). Do NOT translate. Do NOT add parentheticals in another language.
- If the traveler speaks English or mixes languages, still reply only in ${target}, and gently model the ${target} phrasing they were reaching for.

The traveler has just shown you a scene/object they want to talk about.
Scene description from the traveler: "${description || "(no description provided)"}"
${imageUrl ? `(An image was also shared.)` : ""}

- Reply in 1-2 short sentences (max ~40 words), entirely in ${target}.
- Stay warm, vivid, and in-character.
- Anchor the conversation in the scene above — reference details from it.
- Always end with a small question in ${target} that invites them to keep speaking.`;
}

async function chat(messages: ChatMessage[]): Promise<string> {
  const key = process.env.WAFER_API_KEY;
  if (!key) throw new Error("WAFER_API_KEY is not configured");
  const res = await fetch("https://pass.wafer.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "Qwen3.5-397B-A17B", messages }),
  });
  if (!res.ok) throw new Error(`LLM failed ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "…";
}

async function synthesize(text: string, apiKey: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) throw new Error(`TTS failed ${res.status}: ${await res.text()}`);
  return res.arrayBuffer();
}

export const Route = createFileRoute("/api/voice-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const elevenKey = process.env.ELEVENLABS_API_KEY;
          if (!elevenKey) {
            return Response.json({ error: "ELEVENLABS_API_KEY is not configured" }, { status: 500 });
          }

          const contentType = request.headers.get("content-type") ?? "";
          let mode = "turn";
          let location = "the tavern";
          let language = "";
          let description = "";
          let imageUrl: string | null = null;
          let history: ChatMessage[] = [];
          let audio: Blob | null = null;

          if (contentType.includes("application/json")) {
            const body = (await request.json()) as {
              mode?: string;
              location?: string;
              language?: string;
              description?: string;
              image_url?: string | null;
              history?: ChatMessage[];
            };
            mode = body.mode ?? "opening";
            location = body.location ?? location;
            language = body.language ?? "";
            description = body.description ?? "";
            imageUrl = body.image_url ?? null;
            history = body.history ?? [];
          } else {
            const form = await request.formData();
            mode = (form.get("mode") as string) || "turn";
            location = (form.get("location") as string) || location;
            language = (form.get("language") as string) || "";
            description = (form.get("description") as string) || "";
            imageUrl = (form.get("image_url") as string) || null;
            const histRaw = form.get("history") as string | null;
            if (histRaw) {
              try { history = JSON.parse(histRaw); } catch { /* empty */ }
            }
            const a = form.get("audio");
            if (a instanceof Blob) audio = a;
          }

          const system = buildSystem(location, language, description, imageUrl);

          if (mode === "opening") {
            const messages: ChatMessage[] = [
              { role: "system", content: system },
              {
                role: "user",
                content:
                  "Greet me warmly in character. Start the conversation by reacting to the scene/object I just described and ask me an opening question about it.",
              },
            ];
            const reply = await chat(messages);
            const mp3 = await synthesize(reply, elevenKey);
            return Response.json({
              transcript: "",
              reply,
              audio: Buffer.from(mp3).toString("base64"),
            });
          }

          if (!audio) {
            return Response.json({ error: "Missing audio file" }, { status: 400 });
          }

          const transcript = await transcribe(audio, elevenKey);
          const messages: ChatMessage[] = [
            { role: "system", content: system },
            ...history,
            { role: "user", content: transcript || "(the traveler said nothing intelligible)" },
          ];
          const reply = await chat(messages);
          const mp3 = await synthesize(reply, elevenKey);
          return Response.json({
            transcript,
            reply,
            audio: Buffer.from(mp3).toString("base64"),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error";
          console.error("voice-chat error:", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
