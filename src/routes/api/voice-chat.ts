import { createFileRoute } from "@tanstack/react-router";

const ELEVEN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — warm innkeeper

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

async function chat(userText: string, location: string, language: string): Promise<string> {
  const key = process.env.WAFER_API_KEY;
  if (!key) throw new Error("WAFER_API_KEY is not configured");

  const systemPrompt = `You are an in-character innkeeper in a fantasy tavern in "${location}".
You are helping the traveler practice their ${language || "target language"} through natural conversation.
- Reply in 1-2 short sentences (max ~40 words).
- Stay warm, vivid, and in-character.
- Gently correct or model better phrasing if their speech has obvious mistakes, but keep it conversational.
- Always end with a small question that invites them to keep speaking.`;

  const res = await fetch("https://pass.wafer.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "Qwen3.5-397B-A17B",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText || "(the traveler said nothing intelligible)" },
      ],
    }),
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
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
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

          const form = await request.formData();
          const audio = form.get("audio");
          const location = (form.get("location") as string) || "the tavern";
          const language = (form.get("language") as string) || "";

          if (!(audio instanceof Blob)) {
            return Response.json({ error: "Missing audio file" }, { status: 400 });
          }

          const transcript = await transcribe(audio, elevenKey);
          const reply = await chat(transcript, location, language);
          const mp3 = await synthesize(reply, elevenKey);
          const audioBase64 = Buffer.from(mp3).toString("base64");

          return Response.json({ transcript, reply, audio: audioBase64 });
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown error";
          console.error("voice-chat error:", message);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
