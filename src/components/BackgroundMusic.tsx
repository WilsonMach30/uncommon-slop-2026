import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

/**
 * Global background music player.
 * - Picks a theme based on the current route.
 * - Listens for "dwa:music-theme" CustomEvent({theme}) to override.
 * - Caches generated theme URLs in memory and localStorage.
 */

type Theme =
  | "intro"
  | "map"
  | "quests"
  | "lore"
  | "armory"
  | "me"
  | "quest"
  | "quest-victory"
  | "quest-lockout";

function themeFromPath(pathname: string, search: URLSearchParams | null): Theme {
  if (pathname === "/" || pathname === "") return "intro";
  if (pathname.startsWith("/quest")) return "quest";
  if (pathname.startsWith("/map")) {
    const t = search?.get("tab");
    if (t === "quests") return "quests";
    if (t === "lore") return "lore";
    if (t === "armory") return "armory";
    if (t === "me") return "me";
    return "map";
  }
  return "intro";
}

const urlCache = new Map<Theme, string>();

async function resolveThemeUrl(theme: Theme): Promise<string> {
  if (urlCache.has(theme)) return urlCache.get(theme)!;
  const lsKey = `dwa_music_${theme}`;
  const stored = typeof window !== "undefined" ? localStorage.getItem(lsKey) : null;
  if (stored) {
    urlCache.set(theme, stored);
    return stored;
  }
  const res = await fetch(`/api/music?theme=${encodeURIComponent(theme)}`);
  if (!res.ok) throw new Error(`music api ${res.status}`);
  const json = (await res.json()) as { url: string | null; available?: boolean };
  if (!json.url) throw new Error("music unavailable");
  urlCache.set(theme, json.url);
  try { localStorage.setItem(lsKey, json.url); } catch { /* ignore */ }
  return json.url;
}

export default function BackgroundMusic() {
  const location = useLocation();
  const [theme, setTheme] = useState<Theme>("intro");
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dwa_music_muted") === "1";
  });
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);

  // Listen for explicit theme overrides
  useEffect(() => {
    const onTheme = (e: Event) => {
      const detail = (e as CustomEvent<{ theme: Theme }>).detail;
      if (detail?.theme) setTheme(detail.theme);
    };
    window.addEventListener("dwa:music-theme", onTheme as EventListener);
    return () => window.removeEventListener("dwa:music-theme", onTheme as EventListener);
  }, []);

  // Route-based theme
  useEffect(() => {
    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    setTheme(themeFromPath(location.pathname, sp));
  }, [location.pathname, location.search]);

  // Unlock playback on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (unlocked) return;
    const unlock = () => {
      setUnlocked(true);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [unlocked]);

  // Load + crossfade when theme changes
  useEffect(() => {
    if (!unlocked || muted) return;
    let cancelled = false;
    setLoading(true);
    resolveThemeUrl(theme)
      .then((url) => {
        if (cancelled) return;
        const a = audioRef.current;
        if (!a) return;
        if (a.src && a.src.includes(url)) return; // already loaded
        // fade out current
        if (fadeRef.current) window.clearInterval(fadeRef.current);
        const startVol = a.volume;
        let step = 0;
        fadeRef.current = window.setInterval(() => {
          step++;
          a.volume = Math.max(0, startVol * (1 - step / 8));
          if (step >= 8) {
            window.clearInterval(fadeRef.current!);
            a.pause();
            a.src = url;
            a.loop = true;
            a.volume = 0;
            a.play().catch(() => {});
            // fade in
            let inStep = 0;
            fadeRef.current = window.setInterval(() => {
              inStep++;
              a.volume = Math.min(0.35, 0.35 * (inStep / 12));
              if (inStep >= 12) window.clearInterval(fadeRef.current!);
            }, 90);
          }
        }, 60);
      })
      .catch(() => { /* silent — first gen takes time */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [theme, unlocked, muted]);

  // Mute toggle
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (muted) a.pause();
    else if (unlocked && a.src) a.play().catch(() => {});
    try { localStorage.setItem("dwa_music_muted", muted ? "1" : "0"); } catch { /* ignore */ }
  }, [muted, unlocked]);

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <button
        type="button"
        onClick={() => {
          setUnlocked(true);
          setMuted((m) => !m);
        }}
        className="fixed bottom-3 right-3 z-[120] w-10 h-10 rounded-full border-2 border-black bg-[#20201a] text-tertiary shadow-hard flex items-center justify-center hover:-translate-y-0.5 transition-transform"
        aria-label={muted ? "Unmute music" : "Mute music"}
        title={muted ? "Unmute music" : "Mute music"}
      >
        {loading && !muted ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : muted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </>
  );
}
