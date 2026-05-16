import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UtensilsCrossed, Plane, Sparkles, Home, ScrollText,
  Flame, Coins, Zap, Lock, ShieldCheck, Loader2,
  Compass, Map as MapIcon, ScrollText as Scroll, BookOpen, User,
} from "lucide-react";
import { loadProfile, getStoredProfileId } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import QuestPanel from "@/components/QuestPanel";
import DialogueBox from "@/components/DialogueBox";
import { useSessionTracker } from "@/hooks/use-session-tracker";
import { toast } from "sonner";
import forestMap from "@/assets/forest-map.jpg";

// Global proficiency XP for the current region (Feature 4)
const REGION_GATE_THRESHOLD = 50;

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

type LocSpec = { name: string; subtitle: string; icon: any; tagline: string; pos: { top: string; left: string } };

const LOCATIONS: Record<string, LocSpec> = {
  food:    { name: "The Brasserie",       subtitle: "Local Tavern",      icon: UtensilsCrossed, tagline: "Order, taste, gossip.",     pos: { top: "58%", left: "48%" } },
  travel:  { name: "Wayfarer's Crossroads",subtitle: "Carriage Stop",     icon: Plane,           tagline: "Maps, fares, weather.",     pos: { top: "44%", left: "22%" } },
  culture: { name: "Bard's Hollow",        subtitle: "Folk Stage",        icon: Sparkles,        tagline: "Songs, dances, riddles.",   pos: { top: "72%", left: "76%" } },
  daily:   { name: "Cobbled Square",       subtitle: "Market & Workshop", icon: Home,            tagline: "Errands, neighbors.",       pos: { top: "75%", left: "32%" } },
  history: { name: "Ancient Ruins",        subtitle: "Crumbling Museum",  icon: ScrollText,      tagline: "Dynasties, relics, lore.",  pos: { top: "52%", left: "68%" } },
};

const REGION_NAMES = ["The Starting Shire", "The Whispering Valley", "Highland Frontier", "Coral Coast"];

function MapDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [gateModal, setGateModal] = useState(false);
  const [activeTrack, setActiveTrack] = useState<{ track: string; location: string; input: string } | null>(null);
  const [currentRegionXp, setCurrentRegionXp] = useState(4);

  // Feature 2: tracks active session time and pushes to user_engagement every 60s
  const { progress, setProgress } = useSessionTracker(profile?.id ?? null);

  useEffect(() => {
    loadProfile().then((p) => {
      if (!p) navigate({ to: "/" });
      else {
        setProfile(p as Profile);
        setCurrentRegionXp((p as Profile).proficiency_score ?? 4);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!profile) return;
    const tick = setInterval(async () => {
      setCurrentRegionXp((x) => Math.min(REGION_GATE_THRESHOLD, x + 1));
      const id = getStoredProfileId();
      if (!id) return;
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
  const gateUnlocked = currentRegionXp >= REGION_GATE_THRESHOLD;

  const handleGateClick = () => {
    if (!gateUnlocked) {
      toast.error("You must log more exploration hours in this region before challenging the Gatekeeper!");
      return;
    }
    setGateModal(true);
  };
  const locations = profile.interests.filter((i) => LOCATIONS[i]).slice(0, 4);
  const manaPct = Math.min(100, Math.round(((profile.map_energy ?? 0) / 100) * 100));

  return (
    <div className="min-h-screen bg-surface text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col panel-bark border-r-2 border-bark p-5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-container border-2 border-tertiary flex items-center justify-center text-tertiary font-serif glow-gold">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-base leading-tight truncate">Elder Linguist</p>
            <p className="text-xs text-muted-foreground font-mono-label">Lv. {profile.exploration_level} Forest Walker</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem icon={MapIcon} label="Map" active />
          <NavItem icon={Scroll} label="Quests" />
          <NavItem icon={BookOpen} label="Compendium" />
          <NavItem icon={ShieldCheck} label="Armory" />
          <NavItem icon={User} label="Profile" />
        </nav>

        <button className="w-full flex items-center justify-center gap-2 bg-tertiary text-tertiary-foreground font-serif rounded-full py-3 border-2 border-tertiary-container glow-gold">
          <MapIcon className="w-4 h-4" /> Open Forest Map
        </button>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mana / status bar */}
        <header className="panel-bark border-b-2 border-bark px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="lg:hidden w-10 h-10 rounded-full bg-primary-container border-2 border-tertiary flex items-center justify-center text-tertiary">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-full border-2 border-tertiary bg-surface-low flex items-center justify-center font-serif text-tertiary text-sm glow-gold">
              {profile.exploration_level}
            </div>
            <div className="leading-tight">
              <p className="font-serif text-sm">Elder Linguist</p>
              <p className="text-[11px] text-muted-foreground font-mono-label flex items-center gap-1">
                <Flame className="w-3 h-3 text-tertiary" /> {profile.streak_days} day streak
              </p>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-primary">Mana</span>
              <span className="font-mono-label text-[10px] text-cream">{profile.map_energy}/100</span>
            </div>
            <div className="h-3 rounded-full bg-surface-low border border-bark overflow-hidden">
              <div className="h-full vial-bar transition-all" style={{ width: `${manaPct}%` }} />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Stat icon={<Coins className="w-3.5 h-3.5" />} label="Gold" value={profile.gold_tokens} />
            <Stat icon={<Zap className="w-3.5 h-3.5" />} label="Energy" value={profile.map_energy} />
          </div>
        </header>

        {/* Region viewport */}
        <section className="relative flex-1 overflow-hidden parchment-inset border-y-2 border-bark">
          <img src={forestMap} alt="Region map of an enchanted forest" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-surface/80" />

          {/* Top label */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 panel-bark border-2 border-tertiary/40 rounded-full px-4 py-1.5">
            <p className="font-mono-label text-[10px] uppercase tracking-[0.35em] text-tertiary flex items-center gap-2">
              <Compass className="w-3 h-3" /> Region {profile.current_region} · <span className="font-serif text-cream normal-case tracking-normal">{region}</span>
            </p>
          </div>

          {/* Region Exam Gate (top right) */}
          <button
            onClick={handleGateClick}
            className="absolute top-16 right-4 sm:top-20 sm:right-8 group transition-transform hover:scale-105"
          >
            <div className={`panel-bark border-2 rounded-md px-3 py-2 flex items-center gap-2 transition-all ${
              gateUnlocked ? "border-tertiary glow-gold animate-pulse" : "border-bark opacity-90"
            }`}>
              <div className={`w-8 h-8 rounded flex items-center justify-center ${
                gateUnlocked ? "bg-tertiary text-tertiary-foreground" : "bg-surface-low text-muted-foreground"
              }`}>
                {gateUnlocked ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div className="text-left leading-tight">
                <p className="font-mono-label text-[9px] uppercase tracking-widest text-tertiary">Region Gate</p>
                <p className="font-serif text-xs text-cream">
                  {gateUnlocked ? "Challenge Ready" : `${currentRegionXp}/${REGION_GATE_THRESHOLD}`}
                </p>
              </div>
            </div>
          </button>

          {/* Location pins */}
          {locations.map((id) => {
            const loc = LOCATIONS[id];
            const Icon = loc.icon;
            return (
              <button
                key={id}
                onClick={() => setActiveLocation(id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ top: loc.pos.top, left: loc.pos.left }}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-primary-container border-2 border-tertiary flex items-center justify-center text-tertiary glow-emerald group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap">
                    <span className="panel-bark border border-tertiary/40 rounded px-2 py-1 font-mono-label text-[10px] uppercase tracking-wider text-cream">
                      {loc.name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Bottom: Daily Adventure Progress */}
          <div className="absolute bottom-4 left-4 right-4 panel-carved rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary">Daily Adventure</p>
              <p className="font-mono-label text-[10px] text-cream">{progress}%</p>
            </div>
            <div className="h-2.5 rounded-full bg-surface-low border border-bark overflow-hidden">
              <div className="h-full vial-bar transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-mono-label">
              Grows with time spent · mistakes never punish you
            </p>
          </div>
        </section>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden panel-bark border-t-2 border-bark px-2 py-2 flex items-center justify-around">
          <BottomTab icon={MapIcon} label="Map" active />
          <BottomTab icon={Scroll} label="Quests" />
          <BottomTab icon={BookOpen} label="Lore" />
          <BottomTab icon={ShieldCheck} label="Armory" />
          <BottomTab icon={User} label="Me" />
        </nav>
      </main>

      {activeLocation && (
        <QuestPanel
          location={LOCATIONS[activeLocation]}
          onClose={() => setActiveLocation(null)}
          profileId={profile.id}
          progress={progress}
          onStartTrack={(track, input) =>
            setActiveTrack({ track, location: LOCATIONS[activeLocation].name, input })
          }
        />
      )}

      {activeTrack && (
        <DialogueBox
          track={activeTrack.track}
          location={activeTrack.location}
          userInput={activeTrack.input}
          onClose={() => setActiveTrack(null)}
        />
      )}

      {/* Fullscreen Regional Proficiency Challenge (Feature 4) */}
      {gateModal && (
        <div
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setGateModal(false)}
        >
          <div
            className="panel-bark border-4 border-tertiary rounded-2xl shadow-panel glow-gold w-full h-full max-w-5xl max-h-[90vh] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setGateModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-low text-muted-foreground"
            >
              ✕
            </button>
            <p className="font-mono-label text-xs uppercase tracking-[0.5em] text-tertiary mb-4 animate-pulse">
              ⟢ The Gatekeeper Awaits ⟣
            </p>
            <h2 className="font-serif text-4xl sm:text-6xl mb-6 text-cream">
              Regional Proficiency<br/><span className="text-tertiary">Challenge</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mb-8 font-serif italic">
              You have proven your dedication to {region}. Step forward and face the trial that will unlock the next territory.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setGateModal(false)}
                className="px-6 py-3 panel-bark border-2 border-bark rounded-full font-mono-label text-xs uppercase tracking-widest text-muted-foreground hover:border-tertiary/40"
              >
                Retreat
              </button>
              <button
                onClick={() => setGateModal(false)}
                className="px-8 py-3 bg-tertiary text-tertiary-foreground rounded-full font-serif text-lg border-2 border-tertiary-container glow-gold"
              >
                Begin the Trial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
      active ? "bg-primary-container text-primary border border-primary/40" : "text-muted-foreground hover:bg-surface-low"
    }`}>
      <Icon className="w-4 h-4" /> <span className="font-mono-label uppercase text-xs tracking-wider">{label}</span>
    </button>
  );
}

function BottomTab({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <button className={`flex-1 flex flex-col items-center gap-0.5 py-1 ${
      active ? "text-tertiary" : "text-muted-foreground"
    }`}>
      <Icon className="w-5 h-5" />
      <span className="font-mono-label text-[9px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 panel-bark border-2 border-tertiary/30 rounded-full px-3 py-1.5">
      <span className="text-tertiary">{icon}</span>
      <div className="leading-tight">
        <p className="font-mono-label text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-serif text-xs text-cream">{value}</p>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="panel-bark border-2 border-tertiary rounded-xl shadow-panel p-6 max-w-md w-full glow-gold"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
