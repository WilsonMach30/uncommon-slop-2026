import { useState } from "react";
import { Volume2, BookMarked, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Entry = { word: string; translation: string; example: string };
type LoreSection = { id: string; title: string; subtitle: string; entries: Entry[] };

const LORE: LoreSection[] = [
  {
    id: "brasserie",
    title: "The Brasserie Dictionary",
    subtitle: "Tavern phrases & dishes",
    entries: [
      { word: "Une carafe d'eau",   translation: "A jug of water",     example: "« Une carafe d'eau, s'il vous plaît. »" },
      { word: "L'addition",          translation: "The bill",           example: "« L'addition, quand vous voulez. »" },
      { word: "Saignant",            translation: "Rare (steak)",       example: "« Je le voudrais saignant. »" },
      { word: "Une recommandation",  translation: "A recommendation",   example: "« Auriez-vous une recommandation ? »" },
    ],
  },
  {
    id: "square",
    title: "Cobbled Square Dialogues",
    subtitle: "Errands & neighborly chatter",
    entries: [
      { word: "Le marché",       translation: "The market",        example: "« Le marché ouvre à six heures. »" },
      { word: "Combien ça coûte",translation: "How much does it cost", example: "« Combien ça coûte, ce pain ? »" },
      { word: "À demain",         translation: "See you tomorrow",  example: "« Merci bien, à demain ! »" },
    ],
  },
  {
    id: "ruins",
    title: "Ancient Ruins Almanac",
    subtitle: "Relics, dynasties, & lore",
    entries: [
      { word: "Une dynastie",    translation: "A dynasty",         example: "« Cette dynastie régna trois siècles. »" },
      { word: "Une fresque",     translation: "A fresco",          example: "« La fresque est presque effacée. »" },
      { word: "Un vestige",      translation: "A relic / remnant", example: "« Ce vestige date de l'antiquité. »" },
    ],
  },
];

export default function LoreView() {
  const [selected, setSelected] = useState(LORE[0]);
  const [playing, setPlaying] = useState<string | null>(null);

  const playMock = (word: string) => {
    setPlaying(word);
    setTimeout(() => setPlaying(null), 1200);
    toast(`🔊 Playing "${word}"`, { description: "Audio playback reserved for ElevenLabs." });
  };

  return (
    <div className="h-full flex bg-parchment border-y-2 border-bark overflow-hidden">
      {/* Left: directory */}
      <aside className="w-44 sm:w-60 shrink-0 bg-parchment-dark border-r-2 border-[#3b1300]/30 overflow-y-auto">
        <div className="p-4 border-b-2 border-[#3b1300]/20">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-[#3b1300]/70">⟢ Almanac ⟣</p>
          <h2 className="font-serif text-base text-[#3b1300] leading-tight mt-1">Explorer's Tome</h2>
        </div>
        <nav className="p-2 space-y-1">
          {LORE.map((s) => {
            const active = selected.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left px-3 py-2.5 rounded transition-colors flex items-start gap-2 ${
                  active ? "bg-[#3b1300] text-[#f4e4c1]" : "hover:bg-[#3b1300]/10 text-[#3b1300]"
                }`}
              >
                <BookMarked className="w-3.5 h-3.5 mt-1 shrink-0" />
                <div className="min-w-0">
                  <p className="font-serif text-xs leading-tight truncate">{s.title}</p>
                  <p className="font-mono-label text-[9px] uppercase tracking-wider opacity-70 truncate">
                    {s.entries.length} entries
                  </p>
                </div>
                {active && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right: entry detail */}
      <article className="flex-1 overflow-y-auto p-5 sm:p-8">
        <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-[#3b1300]/70">
          {selected.subtitle}
        </p>
        <h1 className="font-serif text-2xl sm:text-4xl text-[#3b1300] mt-1 mb-6 border-b-2 border-[#3b1300]/20 pb-3">
          {selected.title}
        </h1>

        <div className="space-y-5">
          {selected.entries.map((e) => (
            <div key={e.word} className="border-b border-[#3b1300]/15 pb-4 last:border-0">
              <div className="flex items-center gap-3">
                <h3 className="font-serif text-xl text-[#3b1300]">{e.word}</h3>
                <button
                  onClick={() => playMock(e.word)}
                  aria-label={`Play pronunciation of ${e.word}`}
                  className={`w-8 h-8 rounded-full bg-[#3b1300] text-[#f4e4c1] flex items-center justify-center hover:bg-[#5c2c12] transition-colors ${
                    playing === e.word ? "animate-pulse" : ""
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-label text-[10px] uppercase tracking-wider text-[#3b1300]/60 ml-auto">
                  {e.translation}
                </span>
              </div>
              <p className="font-serif text-sm italic text-[#3b1300]/80 mt-1.5">{e.example}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
