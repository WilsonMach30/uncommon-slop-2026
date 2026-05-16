import { useEffect, useState } from "react";
import { Check, Trophy, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Quest = {
  id: string;
  kind: "daily" | "epic";
  title: string;
  location: string | null;
  progress: number;
  target: number;
  completed_at: string | null;
};

const DEFAULT_DAILIES = [
  { title: "Converse for 10 minutes at The Brasserie", location: "The Brasserie", target: 10 },
  { title: "Decipher 3 scrolls in Bard's Hollow",        location: "Bard's Hollow",  target: 3  },
  { title: "Scribe 5 lines in the Cobbled Square",       location: "Cobbled Square", target: 5  },
];

const DEFAULT_EPICS = [
  { title: "Conquer the Region 1 Exam Gate",       location: null, target: 50 },
  { title: "Reach Level 10 Forest Walker",         location: null, target: 10 },
];

export default function QuestsView({ profileId, regionXp, explorationLevel }: {
  profileId: string;
  regionXp: number;
  explorationLevel: number;
}) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulsing, setPulsing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("user_quests")
        .select("*").eq("profile_id", profileId).order("created_at");
      if (cancelled) return;
      if (!data || data.length === 0) {
        const seed = [
          ...DEFAULT_DAILIES.map((d) => ({ ...d, kind: "daily" as const, profile_id: profileId })),
          ...DEFAULT_EPICS.map((d) => ({ ...d, kind: "epic" as const, profile_id: profileId })),
        ];
        const { data: inserted } = await supabase.from("user_quests").insert(seed).select();
        setQuests((inserted ?? []) as Quest[]);
      } else {
        setQuests(data as Quest[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  const toggleComplete = async (q: Quest) => {
    if (q.completed_at) return;
    setPulsing(q.id);
    setTimeout(() => setPulsing(null), 900);
    const completed_at = new Date().toISOString();
    setQuests((prev) => prev.map((x) => x.id === q.id ? { ...x, completed_at, progress: x.target } : x));
    await supabase.from("user_quests")
      .update({ completed_at, progress: q.target }).eq("id", q.id);
  };

  const dailies = quests.filter((q) => q.kind === "daily");
  const epics = quests.filter((q) => q.kind === "epic");

  const epicProgress = (q: Quest) => {
    if (q.title.includes("Region 1 Exam")) return Math.min(q.target, regionXp);
    if (q.title.includes("Level 10")) return Math.min(q.target, explorationLevel);
    return q.progress;
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Posting bounties…</div>;

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full">
      <header className="mb-6">
        <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary">⟢ The Notice Board ⟣</p>
        <h2 className="font-serif text-3xl text-cream mt-1">Bounty Board</h2>
        <p className="text-xs text-muted-foreground mt-1">Posted at dawn · expires at dusk</p>
      </header>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-tertiary" />
          <h3 className="font-serif text-lg text-cream">Daily Bounties</h3>
          <span className="font-mono-label text-[10px] text-muted-foreground ml-auto">
            {dailies.filter((d) => d.completed_at).length} / {dailies.length}
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {dailies.map((q) => {
            const done = !!q.completed_at;
            return (
              <button
                key={q.id}
                onClick={() => toggleComplete(q)}
                className={`relative text-left bg-[#f4e4c1] text-[#3b1300] rounded-md p-4 border border-tertiary/10 shadow-hard transition-transform hover:-translate-y-0.5 ${
                  done ? "opacity-80" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 mt-0.5 w-6 h-6 rounded border-2 border-[#3b1300] flex items-center justify-center bg-[#fdf6e3] ${
                    pulsing === q.id ? "animate-mana-pulse" : ""
                  } ${done ? "bg-[#4ade80] text-[#003829]" : ""}`}>
                    {done && <Check className="w-4 h-4" strokeWidth={3} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-serif text-sm leading-snug ${done ? "line-through" : ""}`}>
                      {q.title}
                    </p>
                    {q.location && (
                      <p className="font-mono-label text-[10px] uppercase tracking-wider mt-1 flex items-center gap-1 opacity-70">
                        <MapPin className="w-3 h-3" /> {q.location}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-tertiary" />
          <h3 className="font-serif text-lg text-cream">Epic Milestones</h3>
        </div>
        <div className="space-y-3">
          {epics.map((q) => {
            const pg = epicProgress(q);
            const pct = Math.min(100, (pg / q.target) * 100);
            const done = pg >= q.target;
            return (
              <div
                key={q.id}
                className="bg-[#f4e4c1] text-[#3b1300] rounded-md p-4 border border-tertiary/10 shadow-hard"
              >
                <div className="flex items-center justify-between mb-2 gap-3">
                  <h4 className="font-serif text-base">{q.title}</h4>
                  <span className="font-mono-label text-[11px] uppercase tracking-wider whitespace-nowrap">
                    {pg} / {q.target}
                  </span>
                </div>
                <div className="h-3 bg-[#3b1300]/15 rounded-full overflow-hidden border border-[#3b1300]/20">
                  <div className={`h-full transition-all ${done ? "bg-[#4ade80]" : "vial-bar"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
