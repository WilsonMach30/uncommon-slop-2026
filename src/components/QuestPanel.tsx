import { useState } from "react";
import { Megaphone, Feather, BookOpen, X, Sparkles } from "lucide-react";
import { logEngagement } from "@/lib/profile";

type Loc = { name: string; subtitle: string; icon: any; tagline: string };

const TRACKS = [
  { id: "speaking", label: "The Speaking Track", icon: Megaphone, sub: "Talk to the locals. AI Voice Session." },
  { id: "writing", label: "The Writing Track", icon: Feather, sub: "Scribe a tale. Dynamic Prompt." },
  { id: "reading", label: "The Reading Track", icon: BookOpen, sub: "Decipher the runes. Short Story." },
];

export default function QuestPanel({
  location, onClose, profileId, progress,
}: {
  location: Loc; onClose: () => void; profileId: string; progress: number;
}) {
  const [input, setInput] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);

  const start = async (track: string) => {
    setChosen(track);
    await logEngagement(profileId, {
      event_type: "quest_started",
      location_name: location.name,
      track,
      session_input: input,
      duration_seconds: 0,
    });
    // Stub: in future, call LLM with (level, location, input) → personalized prompt
  };

  const Icon = location.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-stretch justify-end" onClick={onClose}>
      <aside
        className="w-full max-w-2xl bg-surface border-l-2 border-tertiary overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-blur sticky top-0 border-b-2 border-gold-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-tertiary text-tertiary-foreground border-2 border-black rounded-md flex items-center justify-center shadow-retro-sm">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-tertiary">{location.subtitle}</p>
              <h2 className="font-serif text-xl">{location.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-surface-container-high">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div>
            <p className="font-serif text-2xl leading-snug">
              Welcome to the <span className="text-tertiary">{location.name}</span>!
              What would you like to explore or learn about during this session?
            </p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Ordering coffee, ancient swords, asking for directions…"
              className="mt-4 w-full bg-surface-container border-2 border-gold-10 focus:border-tertiary outline-none rounded-md p-4 min-h-[100px] text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-3">
            <p className="font-serif text-xs uppercase tracking-[0.3em] text-tertiary">Choose a track</p>
            {TRACKS.map((t) => {
              const TIcon = t.icon;
              const active = chosen === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => start(t.id)}
                  className={`w-full flex items-start gap-4 p-5 text-left rounded-md border-2 transition-all ${
                    active
                      ? "bg-surface-container-high border-primary shadow-retro glow-green"
                      : "bg-surface-container border-gold-10 hover:border-tertiary hover:-translate-y-0.5 shadow-retro-sm"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-md border-2 border-black flex items-center justify-center shadow-retro-sm ${
                    active ? "bg-primary text-primary-foreground" : "bg-tertiary text-tertiary-foreground"
                  }`}>
                    <TIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg">{t.label}</h3>
                    <p className="text-sm text-muted-foreground">{t.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {chosen && (
            <div className="bg-surface-container border-2 border-primary rounded-md p-5 shadow-retro-sm">
              <p className="flex items-center gap-2 text-sm text-tertiary uppercase tracking-widest mb-2">
                <Sparkles className="w-4 h-4" /> Session queued
              </p>
              <p className="text-muted-foreground">
                Your AI tutor will tailor a {chosen} quest around
                {input ? <> <span className="text-foreground font-medium">"{input}"</span></> : " your chosen theme"}.
                (LLM connection coming online soon.)
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-serif text-xs uppercase tracking-[0.3em] text-tertiary">Daily Adventure Progress</p>
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
            <div className="h-3 bg-surface-container rounded border-2 border-black overflow-hidden">
              <div className="h-full bg-primary glow-green" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
