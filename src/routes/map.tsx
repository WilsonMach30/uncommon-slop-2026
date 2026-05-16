import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UtensilsCrossed, Plane, Sparkles, Home, ScrollText,
  Flame, Coins, Zap, Lock, ShieldCheck, Loader2, Compass,
} from "lucide-react";
import { loadProfile, getStoredProfileId } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import QuestPanel from "@/components/QuestPanel";

export const Route = createFileRoute("/map")({
  component: MapDashboard,
});

type Profile = {
  id: string;
  language: string;
  interests: string[];
  current_region: number;
  exploration_level: number;
  gold_tokens: number;
  map_energy: number;
  proficiency_score: number;
  streak_days: number;
};

const LOCATIONS: Record<string, { name: string; subtitle: string; icon: any; tagline: string }> = {
  food: { name: "Local Tavern", subtitle: "Brasserie of the Shire", icon: UtensilsCrossed, tagline: "Order, taste, gossip." },
  travel: { name: "Wayfarer's Crossroads", subtitle: "Carriage Stop", icon: Plane, tagline: "Maps, fares, weather." },
  culture: { name: "Bard's Hollow", subtitle: "Folk Stage", icon: Sparkles, tagline: "Songs, dances, riddles." },
  daily: { name: "Cobbled Square", subtitle: "Market & Workshop", icon: Home, tagline: "Errands, neighbors, time." },
  history: { name: "Ancient Ruins", subtitle: "Crumbling Museum", icon: ScrollText, tagline: "Dynasties, relics, lore." },
};

const REGION_NAMES = ["The Starting Shire", "The Whispering Valley", "Highland Frontier", "Coral Coast"];

function MapDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // 0..100, tied to session time
  const [gateModal, setGateModal] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => {
      if (!p) {
        navigate({ to: "/" });
      } else {
        setProfile(p as Profile);
      }
    });
  }, [navigate]);

  // Active session timer → adds map energy + gold + adventure progress purely by time
  useEffect(() => {
    if (!profile) return;
    const tick = setInterval(async () => {
      setProgress((p) => Math.min(100, p + 1));
      const id = getStoredProfileId();
      if (!id) return;
      // Every ~30s, persist a small reward and an engagement log
      const { data } = await supabase
        .from("profiles")
        .update({
          gold_tokens: (profile.gold_tokens ?? 0) + 1,
          map_energy: Math.min(999, (profile.map_energy ?? 0) + 1),
          proficiency_score: (profile.proficiency_score ?? 0) + 1,
        })
        .eq("id", id)
        .select()
        .single();
      if (data) setProfile(data as Profile);
      await supabase.from("engagement_logs").insert({
        profile_id: id, event_type: "idle_tick", duration_seconds: 30,
      });
    }, 30000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const region = REGION_NAMES[(profile.current_region - 1) % REGION_NAMES.length];
  const gateUnlocked = profile.proficiency_score >= 50;
  const locations = profile.interests.slice(0, 4);

  return (
    <div className="min-h-screen bg-surface text-foreground">
      {/* HUD */}
      <header className="sticky top-0 z-30 hud-blur border-b-2 border-gold-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-primary text-primary-foreground border-2 border-black shadow-retro-sm flex items-center justify-center font-serif font-bold">
              {profile.language.toUpperCase().slice(0,2)}
            </div>
            <div>
              <p className="font-serif text-[10px] uppercase tracking-[0.3em] text-tertiary">Explorer Lv. {profile.exploration_level}</p>
              <div className="flex items-center gap-1 text-sm">
                <Flame className="w-4 h-4 text-tertiary" />
                <span className="font-semibold">{profile.streak_days}</span>
                <span className="text-muted-foreground text-xs">day streak</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Stat icon={<Zap className="w-4 h-4" />} label="Energy" value={profile.map_energy} />
            <Stat icon={<Coins className="w-4 h-4" />} label="Gold" value={profile.gold_tokens} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Region header */}
        <div className="mb-10">
          <p className="font-serif text-xs uppercase tracking-[0.3em] text-tertiary mb-2 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" /> Region {profile.current_region}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl">{region}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Wander between locations shaped by your interests. Time spent here grows your strength —
            mistakes never punish you.
          </p>
        </div>

        {/* Locations grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {locations.map((id) => {
            const loc = LOCATIONS[id];
            if (!loc) return null;
            const Icon = loc.icon;
            return (
              <button
                key={id}
                onClick={() => setActiveLocation(id)}
                className="group text-left bg-surface-container border-2 border-gold-10 rounded-md p-6 shadow-retro hover:-translate-y-1 hover:border-tertiary transition-all glow-green"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-md bg-tertiary text-tertiary-foreground border-2 border-black flex items-center justify-center shadow-retro-sm">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-tertiary border border-gold-40 rounded px-2 py-1">Open</span>
                </div>
                <h3 className="font-serif text-2xl mb-1">{loc.name}</h3>
                <p className="text-tertiary text-xs uppercase tracking-widest mb-3">{loc.subtitle}</p>
                <p className="text-muted-foreground text-sm">{loc.tagline}</p>
              </button>
            );
          })}

          {/* Region Exam Gate */}
          <button
            onClick={() => setGateModal(true)}
            className={`relative text-left rounded-md p-6 border-2 transition-all md:col-span-2 lg:col-span-1 ${
              gateUnlocked
                ? "bg-surface-container border-tertiary shadow-retro glow-gold hover:-translate-y-1"
                : "bg-surface-bright/40 border-gold-10 cursor-pointer opacity-80"
            }`}
          >
            <div className="flex items-start justify-between mb-6">
              <div className={`w-14 h-14 rounded-md border-2 border-black flex items-center justify-center shadow-retro-sm ${
                gateUnlocked ? "bg-primary text-primary-foreground" : "bg-surface-container-high text-muted-foreground"
              }`}>
                {gateUnlocked ? <ShieldCheck className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
              </div>
              <span className={`text-[10px] uppercase tracking-widest border rounded px-2 py-1 ${
                gateUnlocked ? "text-tertiary border-gold-40" : "text-muted-foreground border-gold-10"
              }`}>
                {gateUnlocked ? "Ready" : `Locked · ${profile.proficiency_score}/50`}
              </span>
            </div>
            <h3 className="font-serif text-2xl mb-1">The Region Gate</h3>
            <p className="text-tertiary text-xs uppercase tracking-widest mb-3">Proficiency Challenge</p>
            <p className="text-muted-foreground text-sm">
              {gateUnlocked
                ? "The fortress doors hum. Step forward to unlock the next territory."
                : "The gate stands sealed. Grow your exploration to awaken it."}
            </p>
          </button>
        </section>

        {/* Daily Adventure Progress */}
        <section className="bg-surface-container border-2 border-gold-10 rounded-md p-5 shadow-retro-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-serif text-sm uppercase tracking-widest text-tertiary">Daily Adventure Progress</p>
            <p className="text-xs text-muted-foreground">Time spent · {progress}%</p>
          </div>
          <div className="h-4 bg-surface rounded border-2 border-black overflow-hidden">
            <div
              className="h-full bg-primary glow-green transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>
      </main>

      {activeLocation && (
        <QuestPanel
          location={LOCATIONS[activeLocation]}
          onClose={() => setActiveLocation(null)}
          profileId={profile.id}
          progress={progress}
        />
      )}

      {gateModal && (
        <Modal onClose={() => setGateModal(false)}>
          <h2 className="font-serif text-3xl mb-3">Regional Proficiency Challenge</h2>
          <p className="text-muted-foreground mb-6">
            Are you ready to attempt the challenge to unlock the next territory?
            Your hidden proficiency score is{" "}
            <span className="text-tertiary font-semibold">{profile.proficiency_score}</span>.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setGateModal(false)}
              className="px-5 py-3 border-2 border-gold-10 rounded-md font-medium hover:border-gold-40"
            >
              Not yet
            </button>
            <button
              disabled={!gateUnlocked}
              onClick={() => setGateModal(false)}
              className="px-5 py-3 bg-primary text-primary-foreground border-2 border-black rounded-md font-serif shadow-retro-sm disabled:opacity-40"
            >
              {gateUnlocked ? "Enter the Gate" : "Locked"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 bg-surface-container border-2 border-gold-10 rounded-md px-3 py-2 shadow-retro-sm">
      <span className="text-tertiary">{icon}</span>
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-serif text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-container border-2 border-tertiary rounded-md shadow-retro p-8 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
