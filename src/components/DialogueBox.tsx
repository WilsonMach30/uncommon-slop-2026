import { useEffect, useState } from "react";
import { X, Volume2 } from "lucide-react";

type Turn = {
  speaker: string;
  track: string;
  text: string;
  choices: { id: string; label: string }[];
};

export default function DialogueBox({
  track, location, theme, userInput, onClose,
}: {
  track: string; location: string; theme?: string; userInput?: string; onClose: () => void;
}) {
  const [turn, setTurn] = useState<Turn | null>(null);
  const [loading, setLoading] = useState(true);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/generate-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track, location, theme, userInput }),
    })
      .then((r) => r.json())
      .then((data: Turn) => { if (!cancelled) { setTurn(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [track, location, theme, userInput]);

  // Typewriter effect for character text
  useEffect(() => {
    if (!turn) return;
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(turn.text.slice(0, i));
      if (i >= turn.text.length) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [turn]);

  const isSpeaking = track === "speaking";

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="panel-bark border-2 border-tertiary rounded-xl shadow-panel w-full max-w-2xl glow-gold animate-in slide-in-from-bottom-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-bark">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-tertiary flex items-center justify-center text-tertiary font-serif glow-gold shrink-0">
              {(turn?.speaker ?? "?").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-mono-label text-[9px] uppercase tracking-[0.3em] text-tertiary">{track} track</p>
              <p className="font-serif text-base text-cream truncate">{turn?.speaker ?? "…"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-low text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio equalizer (speaking only) */}
        {isSpeaking && (
          <div className="px-5 pt-4 flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-primary" />
            <div className="flex items-end gap-1 h-6">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="w-1.5 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${30 + (i % 4) * 18}%`,
                    animationDelay: `${i * 90}ms`,
                    animationDuration: "900ms",
                  }}
                />
              ))}
            </div>
            <span className="font-mono-label text-[10px] uppercase tracking-widest text-primary">Live audio</span>
          </div>
        )}

        {/* Dialogue text — classic RPG box */}
        <div className="px-5 py-5">
          <div className="panel-carved rounded-md border-2 border-bark p-4 sm:p-5 min-h-[120px]">
            <p className="font-serif text-base sm:text-lg leading-relaxed text-cream">
              {loading ? "…" : typed}
              <span className="inline-block w-2 h-4 ml-0.5 bg-tertiary align-middle animate-pulse" />
            </p>
          </div>
        </div>

        {/* Choices */}
        <div className="px-5 pb-5 grid gap-2">
          {(turn?.choices ?? []).map((c) => (
            <button
              key={c.id}
              className="w-full text-left px-4 py-3 panel-bark border-2 border-bark rounded-md hover:border-tertiary transition-colors font-serif text-sm text-cream"
            >
              <span className="text-tertiary font-mono-label text-[10px] uppercase tracking-widest mr-2">▸</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
