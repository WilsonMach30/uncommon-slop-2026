import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Plane, Sparkles, Home, ScrollText, Loader2, Footprints } from "lucide-react";
import { createProfile, loadProfile } from "@/lib/profile";
import portal from "@/assets/forest-portal.jpg";

export const Route = createFileRoute("/")({
  component: Onboarding,
});

const LANGUAGES = [
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
];

const INTERESTS = [
  { id: "food", label: "Food & Cuisine", icon: UtensilsCrossed, desc: "Taverns, recipes, markets" },
  { id: "travel", label: "Travel & Landmarks", icon: Plane, desc: "Cities, coasts, mountains" },
  { id: "culture", label: "Culture & Folklore", icon: Sparkles, desc: "Tales, festivals, music" },
  { id: "daily", label: "Daily Life & Chores", icon: Home, desc: "Mornings, errands, work" },
  { id: "history", label: "History & Legends", icon: ScrollText, desc: "Ruins, heroes, dynasties" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("es");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => {
      if (p) navigate({ to: "/map" });
      else setLoading(false);
    });
  }, [navigate]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const begin = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      await createProfile(language, selected);
      navigate({ to: "/map" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${portal})` }}
      />
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-surface/40 via-surface/85 to-surface" />

      <div className="max-w-3xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary mb-3">
            ⟢ Chapter I · The Awakening ⟣
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-3">
            Choose your tongue.<br/>
            <span className="text-emerald-soft">Begin the journey.</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Your forest is shaped by what you love. You are rewarded for showing up — never punished for mistakes.
          </p>
        </div>

        <section className="panel-carved rounded-lg p-5 mb-5">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary mb-3">
            ⟢ Target Tongue
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {LANGUAGES.map((l) => {
              const active = language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`p-3 rounded-md text-center transition-all border-2 ${
                    active
                      ? "bg-tertiary-container border-tertiary glow-gold"
                      : "bg-surface-low border-bark hover:border-tertiary/60"
                  }`}
                >
                  <div className="text-2xl mb-1">{l.flag}</div>
                  <div className="text-[10px] font-mono-label uppercase tracking-wider">{l.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel-carved rounded-lg p-5 mb-6">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary mb-3">
            ⟢ Choose Your Passions <span className="text-muted-foreground normal-case tracking-normal">— pick at least one</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INTERESTS.map((it) => {
              const Icon = it.icon;
              const active = selected.includes(it.id);
              return (
                <button
                  key={it.id}
                  onClick={() => toggle(it.id)}
                  className={`group text-left p-4 rounded-md transition-all border-2 flex items-start gap-3 ${
                    active
                      ? "panel-bark border-tertiary glow-gold"
                      : "bg-surface-low border-bark hover:border-tertiary/60"
                  }`}
                >
                  <div
                    className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 ${
                      active ? "bg-tertiary text-tertiary-foreground border-tertiary" : "bg-surface border-bark text-tertiary"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-base leading-tight mb-0.5">{it.label}</h3>
                    <p className="text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-mono-label">
            {selected.length} {selected.length === 1 ? "passion" : "passions"} chosen
          </p>
          <button
            onClick={begin}
            disabled={selected.length === 0 || submitting}
            className="flex items-center gap-2 px-6 py-3 font-serif text-base bg-tertiary text-tertiary-foreground rounded-full border-2 border-tertiary-container glow-gold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            <Footprints className="w-5 h-5" />
            {submitting ? "Forging…" : "Begin Journey"}
          </button>
        </div>
      </div>
    </div>
  );
}
