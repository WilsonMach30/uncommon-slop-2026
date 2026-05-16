import { useState } from "react";
import { Megaphone, Feather, BookOpen, X, Sparkles, Flame } from "lucide-react";
import { logEngagement } from "@/lib/profile";

type Loc = { name: string; subtitle: string; icon: any; tagline: string };

const TRACKS = [
  { id: "speaking", label: "Speaking", sub: "Voice Quest", icon: Megaphone, desc: "Talk to the locals." },
  { id: "writing",  label: "Writing",  sub: "Runic Inscription", icon: Feather, desc: "Scribe a tale." },
  { id: "reading",  label: "Reading",  sub: "Scroll Deciphering", icon: BookOpen, desc: "Decipher the runes." },
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
  };

  const Icon = location.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="panel-bark border-2 border-tertiary rounded-xl shadow-panel max-w-lg w-full my-8 glow-gold"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-8 pb-5 text-center border-b-2 border-bark">
          <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-surface-low text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary-container border-2 border-primary flex items-center justify-center text-primary glow-emerald">
            <Icon className="w-6 h-6" />
          </div>
          <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary mb-1">{location.subtitle}</p>
          <h2 className="font-serif text-2xl sm:text-3xl leading-tight">Trial of the<br/><span className="text-tertiary">{location.name}</span></h2>
          <p className="text-muted-foreground text-xs mt-3">
            Choose your method of deciphering. The path you select dictates the trials ahead.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-px w-12 bg-bark" />
            <span className="text-tertiary text-xs">✦</span>
            <div className="h-px w-12 bg-bark" />
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary block mb-2">
              ⟢ What will you explore?
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Ordering coffee, ancient swords…"
              className="w-full bg-surface-low border-2 border-bark focus:border-tertiary outline-none rounded-md p-3 text-sm font-mono-label min-h-[70px] text-cream placeholder:text-muted-foreground/60 shadow-carved"
            />
          </div>

          <div className="space-y-2.5">
            {TRACKS.map((t) => {
              const TIcon = t.icon;
              const active = chosen === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => start(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-md border-2 transition-all ${
                    active
                      ? "panel-bark border-primary glow-emerald"
                      : "bg-surface-low border-bark hover:border-tertiary/60"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-bark text-tertiary"
                  }`}>
                    <TIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-base leading-tight">{t.label}</h3>
                    <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">({t.sub})</p>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 ${active ? "bg-primary border-primary" : "border-bark"}`} />
                </button>
              );
            })}
          </div>

          {chosen && (
            <div className="panel-bark border-2 border-primary rounded-md p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your tutor will tailor a <span className="text-cream">{chosen}</span> quest around
                {input ? <> <span className="text-tertiary font-mono-label">"{input}"</span></> : " your chosen theme"}.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary">Daily Adventure</p>
              <p className="font-mono-label text-[10px] text-cream">{progress}%</p>
            </div>
            <div className="h-2 rounded-full bg-surface-low border border-bark overflow-hidden">
              <div className="h-full vial-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <button
            disabled={!chosen}
            className="w-full flex items-center justify-center gap-2 bg-tertiary text-tertiary-foreground font-serif rounded-full py-3 border-2 border-tertiary-container glow-gold disabled:opacity-40 disabled:glow-gold transition-all"
          >
            <Flame className="w-4 h-4" /> Commence Trial
          </button>
        </div>
      </div>
    </div>
  );
}
