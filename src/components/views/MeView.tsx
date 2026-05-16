import { useEffect, useState } from "react";
import { User, Shield, Sparkles, Crown, LogOut, Bell, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const INTEREST_LABELS: Record<string, string> = {
  food: "Food & Cuisine",
  travel: "Travel & Wandering",
  culture: "Culture & Arts",
  daily: "Daily Life",
  history: "History & Legends",
};

const SLOT_EMOJI: Record<string, string> = {
  Headwear: "🧙",
  Back: "🧥",
  "Main Hand": "🪶",
};

export default function MeView({ profileId, profile }: {
  profileId: string;
  profile: {
    id: string; language: string; interests: string[]; exploration_level: number;
    gold_tokens: number; streak_days: number; proficiency_score: number;
    map_energy: number; current_region: number; display_name?: string | null;
  };
}) {
  const [equipped, setEquipped] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("unlocked_cosmetics").select("slot, item_key")
      .eq("profile_id", profileId)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((row) => { if (!map[row.slot]) map[row.slot] = row.item_key; });
        setEquipped(map);
      });
  }, [profileId]);

  // Synthetic per-interest progress derived from current state
  const interestStats = profile.interests.map((i, idx) => ({
    key: i,
    label: INTEREST_LABELS[i] ?? i,
    value: Math.min(100, 12 + idx * 18 + profile.proficiency_score),
  }));

  const trackStats = [
    { label: "Speaking Track", value: Math.min(100, profile.proficiency_score + 8),  color: "vial-bar" },
    { label: "Writing Track",  value: Math.min(100, profile.proficiency_score + 18), color: "mana-bar" },
    { label: "Reading Track",  value: Math.min(100, profile.proficiency_score + 26), color: "vial-bar" },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        {/* Left: avatar / equipped */}
        <aside className="space-y-4">
          <div className="relative panel-bark border-2 border-tertiary rounded-lg p-5 glow-gold shadow-hard">
            {/* Title ribbon */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tertiary text-tertiary-foreground px-4 py-1 rounded-full font-mono-label text-[10px] uppercase tracking-widest border-2 border-tertiary-container whitespace-nowrap">
              {profile.display_name ?? "Wilson"} the Aspiring Bard
            </div>
            <div className="mt-3 aspect-square rounded-md bg-surface-low border-2 border-bark flex items-center justify-center text-7xl relative overflow-hidden">
              <span className="absolute top-2 right-2 text-3xl">{equipped["Headwear"] ? SLOT_EMOJI["Headwear"] : ""}</span>
              <User className="w-24 h-24 text-tertiary" />
              <span className="absolute bottom-2 left-2 text-3xl">{equipped["Back"] ? SLOT_EMOJI["Back"] : ""}</span>
              <span className="absolute bottom-2 right-2 text-3xl">{equipped["Main Hand"] ? SLOT_EMOJI["Main Hand"] : ""}</span>
            </div>
            <div className="mt-4 text-center">
              <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary">
                Lv. {profile.exploration_level} · Region {profile.current_region}
              </p>
              <p className="font-serif text-base text-cream mt-1 capitalize">
                Studying {profile.language}
              </p>
            </div>
          </div>

          <div className="panel-bark border-2 border-bark rounded-lg p-4">
            <h3 className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary mb-3">Equipped Gear</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["Headwear", "Back", "Main Hand"] as const).map((slot) => (
                <div key={slot} className="aspect-square rounded bg-surface-low border-2 border-bark flex flex-col items-center justify-center p-1">
                  <span className="text-2xl">{equipped[slot] ? SLOT_EMOJI[slot] : "—"}</span>
                  <span className="font-mono-label text-[8px] uppercase tracking-wider text-muted-foreground mt-1 text-center leading-tight">{slot}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatChip icon={<Sparkles className="w-3 h-3" />} label="Streak" value={profile.streak_days} />
            <StatChip icon={<Crown className="w-3 h-3" />}    label="Gold"   value={profile.gold_tokens} />
            <StatChip icon={<Shield className="w-3 h-3" />}   label="XP"     value={profile.proficiency_score} />
          </div>
        </aside>

        {/* Right: stats */}
        <main className="space-y-6">
          <section className="panel-bark border-2 border-bark rounded-lg p-5">
            <h3 className="font-serif text-xl text-cream mb-4">Interest Mastery</h3>
            <div className="space-y-3">
              {interestStats.length === 0 ? (
                <p className="text-xs text-muted-foreground">No interests selected.</p>
              ) : interestStats.map((s) => (
                <StatBar key={s.key} label={s.label} value={s.value} barClass="vial-bar" />
              ))}
            </div>
          </section>

          <section className="panel-bark border-2 border-bark rounded-lg p-5">
            <h3 className="font-serif text-xl text-cream mb-4">Track Proficiency</h3>
            <div className="space-y-3">
              {trackStats.map((s) => (
                <StatBar key={s.label} label={s.label} value={s.value} barClass={s.color} />
              ))}
            </div>
          </section>

          {/* Account footer */}
          <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-bark opacity-50 text-[11px] font-mono-label uppercase tracking-wider text-muted-foreground">
            <a className="flex items-center gap-1 hover:text-tertiary cursor-pointer"><Settings className="w-3 h-3" />Settings</a>
            <a className="flex items-center gap-1 hover:text-tertiary cursor-pointer"><Bell className="w-3 h-3" />Notifications</a>
            <a className="hover:text-tertiary cursor-pointer">Privacy</a>
            <a className="hover:text-tertiary cursor-pointer">Terms</a>
            <a className="flex items-center gap-1 hover:text-destructive cursor-pointer ml-auto"><LogOut className="w-3 h-3" />Sign out</a>
          </footer>
        </main>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-surface-low border-2 border-bark rounded-md p-2 text-center">
      <p className="text-tertiary flex justify-center">{icon}</p>
      <p className="font-serif text-base text-cream leading-tight">{value}</p>
      <p className="font-mono-label text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function StatBar({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono-label text-[11px] uppercase tracking-wider text-cream">{label}</span>
        <span className="font-mono-label text-[10px] text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2.5 bg-surface-low border border-bark rounded-full overflow-hidden">
        <div className={`h-full transition-all ${barClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
