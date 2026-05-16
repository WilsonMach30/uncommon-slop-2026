import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UtensilsCrossed, Plane, Sparkles, Home, ScrollText, Compass, Loader2 } from "lucide-react";
import { createProfile, loadProfile } from "@/lib/profile";

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
    <div className="min-h-screen bg-surface text-foreground px-6 py-12 md:py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-md bg-tertiary text-tertiary-foreground flex items-center justify-center shadow-retro-sm border-2 border-black">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <p className="font-serif text-xs uppercase tracking-[0.3em] text-tertiary">Chapter I</p>
            <h1 className="font-serif text-3xl md:text-4xl">Dumb Ways to AI</h1>
          </div>
        </div>

        <p className="font-serif text-2xl md:text-4xl leading-tight max-w-3xl mb-3">
          Choose your tongue. Pick your passions.
          <span className="text-primary"> Begin the journey.</span>
        </p>
        <p className="text-muted-foreground max-w-2xl mb-12">
          Your map is shaped by what you love. We won't grade you on mistakes — only on showing up.
        </p>

        {/* Language */}
        <section className="mb-12">
          <h2 className="text-sm font-serif uppercase tracking-widest text-tertiary mb-4">
            Target Language
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {LANGUAGES.map((l) => {
              const active = language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`p-4 rounded-md text-center transition-all border-2 ${
                    active
                      ? "bg-surface-container border-tertiary shadow-retro glow-gold"
                      : "bg-surface-container border-gold-10 hover:border-gold-40"
                  }`}
                >
                  <div className="text-3xl mb-1">{l.flag}</div>
                  <div className="text-xs font-medium">{l.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Interests */}
        <section className="mb-12">
          <h2 className="text-sm font-serif uppercase tracking-widest text-tertiary mb-4">
            Interest Tags <span className="text-muted-foreground normal-case tracking-normal">— pick at least one</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTERESTS.map((it) => {
              const Icon = it.icon;
              const active = selected.includes(it.id);
              return (
                <button
                  key={it.id}
                  onClick={() => toggle(it.id)}
                  className={`text-left p-5 rounded-md transition-all border-2 ${
                    active
                      ? "bg-surface-container-high border-tertiary shadow-retro -translate-y-0.5"
                      : "bg-surface-container border-gold-10 hover:border-gold-40"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-md flex items-center justify-center mb-4 border-2 ${
                      active ? "bg-tertiary text-tertiary-foreground border-black" : "bg-surface border-gold-10"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-xl mb-1">{it.label}</h3>
                  <p className="text-sm text-muted-foreground">{it.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between flex-wrap gap-4 border-t border-gold-10 pt-6">
          <p className="text-muted-foreground text-sm">
            {selected.length} {selected.length === 1 ? "interest" : "interests"} selected
          </p>
          <button
            onClick={begin}
            disabled={selected.length === 0 || submitting}
            className="px-8 py-4 font-serif text-lg bg-primary text-primary-foreground border-2 border-black rounded-md shadow-retro hover:-translate-y-0.5 active:translate-y-0 active:shadow-retro-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-green"
          >
            {submitting ? "Forging profile..." : "Begin Journey →"}
          </button>
        </div>
      </div>
    </div>
  );
}
