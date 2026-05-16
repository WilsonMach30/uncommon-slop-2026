import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "bg-music";

const THEME_PROMPTS: Record<string, string> = {
  map: "Cozy enchanted forest ambient music, soft harp arpeggios, distant wind chimes, gentle hand drums, mystical and inviting fantasy RPG exploration theme, slow tempo, peaceful, loopable",
  quests: "Uplifting medieval bardic tavern music with lute, hand drums and tin whistle, hopeful heroic adventure quest log theme, mid tempo, loopable",
  lore: "Ancient mystical library ambient, low ethereal choir pads, hand bells, faint page turns, contemplative scholarly atmosphere, very slow, loopable",
  armory: "Blacksmith forge ambient with rhythmic hammer strikes, bellows, warm low strings and dulcimer, medieval craftsmanship workshop, mid tempo, loopable",
  me: "Warm reflective tavern fireplace music, soft acoustic harp and viola, gentle crackling fire, cozy and personal medieval folk lullaby, slow, loopable",
  quest: "Tense suspenseful medieval encounter music with low pulsing cellos, distant war drums, focused challenge atmosphere, dark fantasy, mid tempo, loopable",
  "quest-victory": "Triumphant medieval fanfare with golden trumpets, choir 'ahhs', rolling timpani, joyous victory celebration, fast tempo",
  "quest-lockout": "Somber tavern hearth with crackling fire, low solemn lute and cello, weary defeated rest music, very slow, loopable",
  intro: "Mystical fantasy intro theme, ethereal female choir, deep horns, sense of beginning an epic journey, mid slow, loopable",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function publicMusicUrl(path: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

async function generateMusic(prompt: string, durationSeconds: number): Promise<ArrayBuffer> {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

  const res = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: durationSeconds * 1000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs music gen failed [${res.status}]: ${err}`);
  }
  return res.arrayBuffer();
}

export const Route = createFileRoute("/api/music")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const theme = (url.searchParams.get("theme") ?? "map").toLowerCase();
        const prompt = THEME_PROMPTS[theme];
        if (!prompt) {
          return json({ error: "Unknown theme" }, 400);
        }

        const path = `${theme}.mp3`;
        const publicUrl = publicMusicUrl(path);
        if (!publicUrl) {
          return json({ url: null, available: false, cached: false });
        }

        // Check if already cached
        const headRes = await fetch(publicUrl, { method: "HEAD" });
        if (headRes.ok) {
          return json({ url: publicUrl, available: true, cached: true });
        }

        // Generate, then upload
        try {
          const duration =
            theme === "quest-victory" ? 12 : theme === "quest-lockout" ? 25 : 35;
          const audio = await generateMusic(prompt, duration);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: upErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
          if (upErr) throw upErr;
          return json({ url: publicUrl, available: true, cached: false });
        } catch (e: unknown) {
          console.warn("Background music unavailable", e);
          return json({ url: null, available: false, cached: false });
        }
      },
    },
  },
});
