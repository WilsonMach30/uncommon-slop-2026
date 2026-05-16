import { useEffect, useState } from "react";
import { Shield, Sparkles, Crown, LogOut, Bell, Settings, Check } from "lucide-react";
import {
  TEMPLATES, TEMPLATE_BY_KEY, ITEM_BY_KEY, SLOTS,
  getEquipped, getTemplate, setTemplate, onEquippedChange, onTemplateChange,
} from "@/lib/cosmetics";

const INTEREST_LABELS: Record<string, string> = {
  food: "Food & Cuisine",
  travel: "Travel & Wandering",
  culture: "Culture & Arts",
  daily: "Daily Life",
  history: "History & Legends",
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
  const [templateKey, setTemplateKey] = useState<string>("bard");
  const [popKey, setPopKey] = useState(0);

  useEffect(() => {
    setEquipped(getEquipped(profileId) as Record<string, string>);
    setTemplateKey(getTemplate(profileId));
    const u1 = onEquippedChange(() => {
      setEquipped(getEquipped(profileId) as Record<string, string>);
      setPopKey((k) => k + 1);
    });
    const u2 = onTemplateChange(() => setTemplateKey(getTemplate(profileId)));
    return () => { u1(); u2(); };
  }, [profileId]);

  const template = TEMPLATE_BY_KEY[templateKey] ?? TEMPLATES[0];

  const pickTemplate = (key: string) => {
    setTemplate(profileId, key);
    setPopKey((k) => k + 1);
  };

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
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tertiary text-tertiary-foreground px-4 py-1 rounded-full font-mono-label text-[10px] uppercase tracking-widest border-2 border-tertiary-container whitespace-nowrap">
              {profile.display_name ?? template.name} {template.title}
            </div>
            <div className="mt-3 aspect-square rounded-md bg-surface-low border-2 border-bark flex items-center justify-center relative overflow-hidden">
              {/* Backdrop sparkles */}
              <span className="absolute top-3 left-3 text-tertiary animate-twinkle"><Sparkles className="w-3 h-3" /></span>
              <span className="absolute bottom-6 right-4 text-tertiary animate-twinkle" style={{ animationDelay: "1.2s" }}><Sparkles className="w-2.5 h-2.5" /></span>
              {/* Equipped gear floating layers */}
              <span key={`hat-${popKey}`} className="absolute top-2 right-2 text-3xl animate-gear-pop">
                {equipped["Headwear"] ? ITEM_BY_KEY[equipped["Headwear"]]?.emoji : ""}
              </span>
              <span key={`avatar-${popKey}`} className="text-8xl animate-float select-none">{template.emoji}</span>
              <span key={`back-${popKey}`} className="absolute bottom-2 left-2 text-3xl animate-gear-pop">
                {equipped["Back"] ? ITEM_BY_KEY[equipped["Back"]]?.emoji : ""}
              </span>
              <span key={`hand-${popKey}`} className="absolute bottom-2 right-2 text-3xl animate-gear-pop">
                {equipped["Main Hand"] ? ITEM_BY_KEY[equipped["Main Hand"]]?.emoji : ""}
              </span>
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

          {/* Character template picker */}
          <div className="panel-bark border-2 border-bark rounded-lg p-4">
            <h3 className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary mb-3">Choose Your Form</h3>
            <div className="grid grid-cols-4 gap-2">
              {TEMPLATES.map((t) => {
                const active = t.key === templateKey;
                return (
                  <button
                    key={t.key}
                    onClick={() => pickTemplate(t.key)}
                    title={`${t.name} ${t.title}`}
                    className={`relative aspect-square rounded-md p-1 flex items-center justify-center text-2xl transition-all bg-surface-low border-2 ${
                      active
                        ? "border-tertiary glow-gold scale-105"
                        : "border-bark hover:border-tertiary/60 hover:-translate-y-0.5"
                    }`}
                  >
                    <span className={active ? "animate-float" : ""}>{t.emoji}</span>
                    {active && (
                      <span className="absolute -top-1 -right-1 bg-tertiary text-tertiary-foreground rounded-full p-0.5 border border-tertiary-container">
                        <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-mono-label">
              {template.name} {template.title}
            </p>
          </div>

          {/* Equipped slots */}
          <div className="panel-bark border-2 border-bark rounded-lg p-4">
            <h3 className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary mb-3">Equipped Gear</h3>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((slot) => {
                const eq = equipped[slot];
                const item = eq ? ITEM_BY_KEY[eq] : null;
                return (
                  <div key={slot} className={`aspect-square rounded bg-surface-low border-2 flex flex-col items-center justify-center p-1 transition-all ${
                    item ? "border-[#4ade80] glow-cosmetic" : "border-bark"
                  }`}>
                    <span className="text-2xl">{item?.emoji ?? "—"}</span>
                    <span className="font-mono-label text-[8px] uppercase tracking-wider text-muted-foreground mt-1 text-center leading-tight">
                      {item?.label ?? slot}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-mono-label">
              Buy more in the Armory · tap an owned item to equip
            </p>
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
