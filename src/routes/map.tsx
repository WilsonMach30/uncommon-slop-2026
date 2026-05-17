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
import QuestsView from "@/components/views/QuestsView";
import LoreView from "@/components/views/LoreView";
import ArmoryView from "@/components/views/ArmoryView";
import MeView from "@/components/views/MeView";
import { useSessionTracker } from "@/hooks/use-session-tracker";
import { saveProfileHistoryLevel } from "@/lib/user-profile-history";
import { toast } from "sonner";
import forestMap from "@/assets/forest-map.jpg";

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
  display_name?: string | null;
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

type TabKey = "map" | "quests" | "lore" | "armory" | "me";
const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "map",    label: "Map",    icon: MapIcon },
  { key: "quests", label: "Quests", icon: Scroll },
  { key: "lore",   label: "Lore",   icon: BookOpen },
  { key: "armory", label: "Armory", icon: ShieldCheck },
  { key: "me",     label: "Me",     icon: User },
];

function MapDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<TabKey>("map");
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [gateModal, setGateModal] = useState(false);
  const [activeTrack, setActiveTrack] = useState<{ track: string; location: string; input: string } | null>(null);
  const [readingLoading, setReadingLoading] = useState<{ location: string } | null>(null);
  const [currentRegionXp, setCurrentRegionXp] = useState(4);

  const { progress } = useSessionTracker(profile?.id ?? null);

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
    if (profile?.exploration_level == null) return;
    void saveProfileHistoryLevel(profile.exploration_level);
  }, [profile?.exploration_level]);

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

  // Optimistic gold update (Armory) → also refresh HUD instantly
  const setGold = (next: number) => setProfile((p) => p ? { ...p, gold_tokens: next } : p);

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

        <nav className="space-y-1.5 flex-1">
          {TABS.map((t) => (
            <SideNavItem key={t.key} icon={t.icon} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
          ))}
        </nav>

        <button
          onClick={() => setTab("map")}
          className="w-full flex items-center justify-center gap-2 bg-tertiary text-tertiary-foreground font-serif rounded-full py-3 border-2 border-tertiary-container glow-gold"
        >
          <MapIcon className="w-4 h-4" /> Open Forest Map
        </button>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Persistent Top Sticky HUD */}
        <header className="sticky top-0 z-30 panel-bark border-b-2 border-bark px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="lg:hidden w-10 h-10 rounded-full bg-primary-container border-2 border-tertiary flex items-center justify-center text-tertiary">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0 panel-bark border-2 border-tertiary/40 rounded-full px-3 py-1">
            <Compass className="w-3 h-3 text-tertiary" />
            <span className="font-mono-label text-[10px] uppercase tracking-widest text-tertiary">R{profile.current_region}</span>
            <span className="font-serif text-xs text-cream truncate max-w-[140px]">{region}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-mana">Mana</span>
              <span className="font-mono-label text-[10px] text-cream">{profile.map_energy}/100</span>
            </div>
            <div className="h-3 rounded-full bg-surface-low border border-bark overflow-hidden">
              <div className="h-full mana-bar transition-all" style={{ width: `${manaPct}%` }} />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Stat icon={<Coins className="w-3.5 h-3.5" />} label="Gold" value={profile.gold_tokens} />
            <Stat icon={<Flame className="w-3.5 h-3.5" />} label="Streak" value={profile.streak_days} />
            <Stat icon={<Zap className="w-3.5 h-3.5" />}   label="Energy" value={profile.map_energy} />
          </div>
        </header>

        {/* Tab view container */}
        <section className="flex-1 min-h-0 flex flex-col">
          {tab === "map" && (
            <MapViewport
              profile={profile}
              region={region}
              locations={locations}
              progress={progress}
              currentRegionXp={currentRegionXp}
              gateUnlocked={gateUnlocked}
              onLocationClick={setActiveLocation}
              onGateClick={handleGateClick}
            />
          )}
          {tab === "quests" && (
            <QuestsView profileId={profile.id} regionXp={currentRegionXp} explorationLevel={profile.exploration_level} />
          )}
          {tab === "lore" && <LoreView />}
          {tab === "armory" && (
            <ArmoryView profileId={profile.id} gold={profile.gold_tokens} onGoldChange={setGold} />
          )}
          {tab === "me" && <MeView profileId={profile.id} profile={profile} />}
        </section>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden sticky bottom-0 z-30 panel-bark border-t-2 border-bark px-2 py-2 flex items-center justify-around gap-1">
          {TABS.map((t) => (
            <BottomTab key={t.key} icon={t.icon} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
          ))}
        </nav>
      </main>

      {activeLocation && (
        <QuestPanel
          location={LOCATIONS[activeLocation]}
          onClose={() => setActiveLocation(null)}
          profileId={profile.id}
          progress={progress}
          onStartTrack={async (track, input, meta) => {
            const loc = activeLocation ? LOCATIONS[activeLocation]?.name ?? activeLocation : "the tavern";
            setActiveLocation(null);

            if (track === "reading") {
              setReadingLoading({ location: loc });
              try {
                const res = await fetch("/api/reading-pack", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    language: profile.language,
                    level: profile.exploration_level,
                    interests: profile.interests.join(", "),
                    description: meta?.description ?? input,
                    image_url: meta?.imageUrl ?? null,
                  }),
                });
                const data = await res.json();
                if (!res.ok || !data?.pack) throw new Error(data?.error ?? "Failed to generate reading");
                sessionStorage.setItem("reading_pack", JSON.stringify(data.pack));
              } catch (err) {
                console.error("[reading-pack]", err);
                toast.error("The scrolls would not yield. Try again, wanderer.");
                setReadingLoading(null);
                return;
              }
              setReadingLoading(null);
            }

            navigate({
              to: "/quest",
              search: {
                track,
                location: loc,
                language: profile.language,
                level: profile.exploration_level,
                interests: profile.interests.join(", "),
              },
            });
            void input;
          }}
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

      {readingLoading && (
        <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="panel-bark border-4 border-tertiary rounded-2xl shadow-panel glow-gold max-w-md w-full p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-tertiary mx-auto" />
            <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary mt-6">⟢ The Scribe is Writing ⟣</p>
            <h3 className="font-serif text-2xl text-cream mt-3">Inscribing your scroll…</h3>
            <p className="text-sm text-muted-foreground mt-3 font-serif italic">
              The court scribe of <span className="text-cream">{readingLoading.location}</span> studies your scene and crafts a passage worthy of your trial. Wait here, wanderer.
            </p>
          </div>
        </div>
      )}

        <div
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setGateModal(false)}
        >
          <div
            className="panel-bark border-4 border-tertiary rounded-2xl shadow-panel glow-gold w-full h-full max-w-5xl max-h-[90vh] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setGateModal(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-low text-muted-foreground">✕</button>
            <p className="font-mono-label text-xs uppercase tracking-[0.5em] text-tertiary mb-4 animate-pulse">⟢ The Gatekeeper Awaits ⟣</p>
            <h2 className="font-serif text-4xl sm:text-6xl mb-6 text-cream">
              Regional Proficiency<br/><span className="text-tertiary">Challenge</span>
            </h2>
            <p className="text-muted-foreground text-base max-w-xl mb-8 font-serif italic">
              You have proven your dedication to {region}. Step forward and face the trial that will unlock the next territory.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setGateModal(false)} className="px-6 py-3 panel-bark border-2 border-bark rounded-full font-mono-label text-xs uppercase tracking-widest text-muted-foreground hover:border-tertiary/40">Retreat</button>
              <button onClick={() => setGateModal(false)} className="px-8 py-3 bg-tertiary text-tertiary-foreground rounded-full font-serif text-lg border-2 border-tertiary-container glow-gold">Begin the Trial</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MapViewport({
  profile, region, locations, progress, currentRegionXp, gateUnlocked, onLocationClick, onGateClick,
}: {
  profile: Profile;
  region: string;
  locations: string[];
  progress: number;
  currentRegionXp: number;
  gateUnlocked: boolean;
  onLocationClick: (id: string) => void;
  onGateClick: () => void;
}) {
  return (
    <div className="relative flex-1 overflow-hidden parchment-inset">
      <img src={forestMap} alt="Region map of an enchanted forest" className="absolute inset-0 w-full h-full object-cover animate-bg-drift" />
      <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-transparent to-surface/80" />

      {/* Drifting clouds */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { top: "8%",  size: 90,  dur: 60, delay: 0,   opacity: 0.18 },
          { top: "22%", size: 140, dur: 90, delay: -30, opacity: 0.13 },
          { top: "55%", size: 70,  dur: 75, delay: -50, opacity: 0.10 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cream blur-2xl"
            style={{
              top: c.top, left: 0, width: c.size, height: c.size * 0.5,
              opacity: c.opacity,
              animation: `cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Fireflies */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 32 }).map((_, i) => {
          const left = (i * 37) % 100;
          const top = (i * 53 + 7) % 95;
          const dur = 5 + ((i * 1.3) % 9);
          const delay = (i * 0.4) % 6;
          const size = 3 + (i % 5);
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${left}%`, top: `${top}%`,
                width: size, height: size,
                background: "radial-gradient(circle, #fff7c2 0%, #f7be1d 60%, transparent 80%)",
                boxShadow: "0 0 12px rgba(247,190,29,0.9)",
                animation: `firefly ${dur}s ease-in-out ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>



      {/* Existing sparkle motes */}
      <span className="absolute top-[20%] left-[15%] text-tertiary animate-twinkle"><Sparkles className="w-3 h-3" /></span>
      <span className="absolute top-[35%] right-[20%] text-tertiary animate-twinkle" style={{ animationDelay: "0.8s" }}><Sparkles className="w-2.5 h-2.5" /></span>
      <span className="absolute bottom-[30%] left-[40%] text-tertiary animate-twinkle" style={{ animationDelay: "1.6s" }}><Sparkles className="w-3 h-3" /></span>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 panel-bark border-2 border-tertiary/40 rounded-full px-4 py-1.5">
        <p className="font-mono-label text-[10px] uppercase tracking-[0.35em] text-tertiary flex items-center gap-2">
          <Compass className="w-3 h-3" style={{ animation: "needle-sway 4s ease-in-out infinite", transformOrigin: "center" }} />
          Region {profile.current_region} ·{" "}
          <span className="font-serif text-cream normal-case tracking-normal">{region}</span>
        </p>
      </div>

      <button
        onClick={onGateClick}
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

      {locations.map((id, idx) => {
        const loc = LOCATIONS[id];
        const Icon = loc.icon;
        return (
          <button
            key={id}
            onClick={() => onLocationClick(id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group animate-float"
            style={{ top: loc.pos.top, left: loc.pos.left, animationDelay: `${idx * 0.4}s` }}
          >
            <div className="relative">
              {/* expanding aura rings */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-tertiary"
                style={{ animation: `aura-pulse 2.8s ease-out ${idx * 0.4}s infinite` }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-tertiary/70"
                style={{ animation: `aura-pulse 2.8s ease-out ${idx * 0.4 + 1.4}s infinite` }}
              />
              <div className="relative w-14 h-14 rounded-full bg-primary-container border-2 border-tertiary flex items-center justify-center text-tertiary glow-emerald group-hover:scale-110 transition-transform">
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

      <div className="absolute bottom-4 left-4 right-4 panel-carved rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary">Daily Adventure</p>
          <p className="font-mono-label text-[10px] text-cream">{progress}%</p>
        </div>
        <div className="h-2.5 rounded-full bg-surface-low border border-bark overflow-hidden">
          <div className="h-full vial-bar transition-all animate-shimmer" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 font-mono-label">
          Grows with time spent · mistakes never punish you
        </p>
      </div>
    </div>
  );
}

function SideNavItem({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all bg-surface-low ${
        active
          ? "tab-active text-tertiary"
          : "border-2 border-bark text-muted-foreground hover:border-tertiary/40 hover:text-cream"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-mono-label uppercase text-xs tracking-wider">{label}</span>
    </button>
  );
}

function BottomTab({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all bg-surface-low ${
        active
          ? "tab-active text-tertiary"
          : "border-2 border-transparent text-muted-foreground"
      }`}
    >
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
        <p key={value} className="font-serif text-xs text-cream animate-value-pop">{value}</p>
      </div>
    </div>
  );
}
