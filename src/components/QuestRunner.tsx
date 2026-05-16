import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Check, X, Trophy, ArrowLeft, Flame, Sparkles, Star, Mic, MicOff, Loader2 } from "lucide-react";

const TOTAL_STEPS = 5;
const LOCKOUT_SECONDS = 30;

export default function QuestRunner({ onExit, track = "speaking", location = "the tavern" }: { onExit?: () => void; track?: string; location?: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [lives, setLives] = useState(3);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(LOCKOUT_SECONDS);
  const [victory, setVictory] = useState(false);
  const [shake, setShake] = useState(false);

  // Lockout trigger
  useEffect(() => {
    if (lives <= 0 && !isLockedOut) {
      setIsLockedOut(true);
      setLockoutRemaining(LOCKOUT_SECONDS);
    }
  }, [lives, isLockedOut]);

  // Countdown
  useEffect(() => {
    if (!isLockedOut) return;
    const id = setInterval(() => {
      setLockoutRemaining((s) => {
        if (s <= 1) {
          clearInterval(id);
          setIsLockedOut(false);
          setLives(3);
          setCurrentStep(0);
          return LOCKOUT_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isLockedOut]);

  // Sync music to game state: quest / quest-victory / quest-lockout
  useEffect(() => {
    const theme = victory ? "quest-victory" : isLockedOut ? "quest-lockout" : "quest";
    window.dispatchEvent(new CustomEvent("dwa:music-theme", { detail: { theme } }));
  }, [victory, isLockedOut]);

  const onCorrect = () => {
    if (isLockedOut || victory) return;
    setCurrentStep((s) => {
      const next = Math.min(TOTAL_STEPS, s + 1);
      if (next >= TOTAL_STEPS) setVictory(true);
      return next;
    });
  };

  const onWrong = () => {
    if (isLockedOut || victory) return;
    setLives((l) => Math.max(0, l - 1));
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };

  const resetAll = () => {
    setVictory(false);
    setCurrentStep(0);
    setLives(3);
    setIsLockedOut(false);
  };

  // Red damage vignette — darker, blood-oxide hue
  const vignetteOpacity = lives === 3 ? 0 : lives === 2 ? 0.25 : lives === 1 ? 0.55 : 0.75;
  const vignettePulse = lives === 1;

  // Gold "ascension" overlay — intensifies as steps progress
  const goldStrength = currentStep / TOTAL_STEPS; // 0 → 1

  // Confetti pieces (victory)
  const confetti = useMemo(
    () => Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2.8 + Math.random() * 2.5,
      size: 6 + Math.random() * 10,
      rot: Math.random() * 360,
      color: ["#f7be1d", "#fde68a", "#4ade80", "#fb7185", "#a78bfa", "#38bdf8"][i % 6],
    })),
    [victory],
  );

  // Sparkle stars
  const sparkles = useMemo(
    () => Array.from({ length: 22 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 1.2,
      size: 8 + Math.random() * 18,
    })),
    [victory],
  );

  // Golden birds soaring across the screen
  const birds = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => ({
      id: i,
      top: 5 + Math.random() * 60,
      delay: Math.random() * 3,
      duration: 5 + Math.random() * 4,
      size: 28 + Math.random() * 22,
      flap: 0.35 + Math.random() * 0.35,
    })),
    [victory],
  );

  // Flowers floating upward
  const flowers = useMemo(
    () => Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 6 + Math.random() * 4,
      size: 18 + Math.random() * 18,
      emoji: ["🌸", "🌼", "🌺", "🌷", "💮", "🏵️"][i % 6],
    })),
    [victory],
  );

  // Fire embers (still used as ambient warmth around bed)
  const embers = useMemo(
    () => Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 3,
      size: 4 + Math.random() * 8,
    })),
    [isLockedOut],
  );

  return (
    <div className={`relative min-h-screen bg-surface text-cream overflow-hidden ${shake ? "animate-[shake_0.35s_ease-in-out]" : ""}`}>
      {/* === Gold progressive ascension overlay === */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[80] transition-opacity duration-700"
        style={{
          opacity: goldStrength * 0.75,
          background:
            "radial-gradient(ellipse at center, rgba(247,190,29,0.35) 0%, rgba(247,190,29,0.18) 40%, transparent 75%)",
        }}
      />
      {/* Gold edge bloom that grows with progress */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[81] transition-opacity duration-700"
        style={{
          opacity: goldStrength,
          boxShadow: `inset 0 0 ${40 + goldStrength * 120}px ${10 + goldStrength * 40}px rgba(247,190,29,${0.25 + goldStrength * 0.45})`,
        }}
      />

      {/* === Red damage vignette (darker oxblood) === */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-[90] transition-opacity duration-500 ${vignettePulse ? "animate-pulse" : ""}`}
        style={{
          opacity: vignetteOpacity,
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(120,18,18,0.7) 75%, #4a0a0a 100%)",
        }}
      />

      {/* === Top HUD === */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-3 border-b-2 border-black/60 bg-black/40 backdrop-blur-sm">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-black bg-[#20201a] hover:bg-[#2a2a22] text-xs font-mono-label uppercase tracking-wider shadow-hard"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Flee
        </button>

        {/* Progress segments */}
        <div className="flex-1 flex items-center gap-1.5 mx-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const filled = i < currentStep;
            return (
              <div
                key={i}
                className="flex-1 h-3 rounded-sm border-2 border-black bg-[#20201a] overflow-hidden shadow-hard"
              >
                <div
                  className="h-full transition-all duration-700 ease-out"
                  style={{
                    width: filled ? "100%" : "0%",
                    background: "linear-gradient(90deg, #4ade80, #86efac)",
                    boxShadow: filled ? "0 0 12px rgba(74,222,128,0.7) inset" : "none",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Lives */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => {
            const active = i < lives;
            return (
              <Heart
                key={i}
                className={`w-6 h-6 transition-all duration-300 ${active ? "scale-100" : "scale-75 opacity-30"}`}
                strokeWidth={2.5}
                style={{
                  color: active ? "#f7be1d" : "#3a3a30",
                  fill: active ? "#f7be1d" : "transparent",
                  filter: active ? "drop-shadow(0 0 6px rgba(247,190,29,0.6))" : "none",
                }}
              />
            );
          })}
        </div>
      </header>

      {/* === Main Q&A workspace === */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[#20201a] border-2 border-black shadow-hard rounded-md p-6">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary">
            ⟢ Step {Math.min(currentStep + 1, TOTAL_STEPS)} of {TOTAL_STEPS} ⟣
          </p>
          <h2 className="font-serif text-2xl mt-2 mb-6 leading-snug">
            The innkeeper sets down a steaming bowl. "Try it, traveler — and tell me, how does one say <em className="text-tertiary">'delicious'</em> in your tongue?"
          </h2>

          <div className="grid gap-3">
            {["Délicieux", "Effrayant", "Ennuyeux", "Coûteux"].map((opt, i) => (
              <button
                key={i}
                disabled={isLockedOut}
                className="text-left px-4 py-3 rounded border-2 border-black bg-[#2a2a22] hover:bg-[#34342a] hover:-translate-y-0.5 transition-transform font-serif text-base shadow-hard disabled:opacity-50"
              >
                <span className="font-mono-label text-[10px] text-tertiary mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* === Cheat toolbar === */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center bg-black/30 border-2 border-dashed border-tertiary/40 rounded p-3">
          <span className="w-full text-center font-mono-label text-[10px] uppercase tracking-widest text-tertiary/80">
            ⚙ Dungeon Master Cheats
          </span>
          <button
            onClick={onCorrect}
            disabled={isLockedOut || victory}
            className="flex items-center gap-2 px-4 py-2 rounded border-2 border-black bg-[#4ade80] text-[#003829] font-bold text-xs uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform disabled:opacity-40"
          >
            <Check className="w-4 h-4" /> Simulate Correct
          </button>
          <button
            onClick={onWrong}
            disabled={isLockedOut || victory}
            className="flex items-center gap-2 px-4 py-2 rounded border-2 border-black bg-[#ef4444] text-white font-bold text-xs uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform disabled:opacity-40"
          >
            <X className="w-4 h-4" /> Simulate Wrong
          </button>
        </div>
      </main>

      {/* === Victory dialog === */}
      {victory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden animate-[fade-in_0.4s_ease-out]">
          {/* radiant gold backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 animate-[fade-in_0.6s_ease-out]"
            style={{
              background:
                "radial-gradient(circle at center, rgba(247,190,29,0.55) 0%, rgba(120,75,0,0.7) 45%, rgba(10,10,10,0.92) 100%)",
            }}
          />
          {/* rotating god-rays */}
          <div
            aria-hidden
            className="absolute inset-0 animate-[spin_18s_linear_infinite] opacity-60"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(247,190,29,0.35) 12deg, transparent 24deg, transparent 60deg, rgba(247,190,29,0.25) 72deg, transparent 84deg, transparent 120deg, rgba(247,190,29,0.3) 132deg, transparent 144deg, transparent 180deg, rgba(247,190,29,0.25) 192deg, transparent 204deg, transparent 240deg, rgba(247,190,29,0.3) 252deg, transparent 264deg, transparent 300deg, rgba(247,190,29,0.25) 312deg, transparent 324deg, transparent 360deg)",
              maskImage: "radial-gradient(circle at center, black 10%, transparent 70%)",
            }}
          />
          {/* confetti rain */}
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
            {confetti.map((c) => (
              <span
                key={c.id}
                className="absolute top-0 block"
                style={{
                  left: `${c.left}%`,
                  width: c.size,
                  height: c.size * 0.4,
                  background: c.color,
                  transform: `rotate(${c.rot}deg)`,
                  borderRadius: 2,
                  animation: `confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
                  boxShadow: `0 0 6px ${c.color}88`,
                }}
              />
            ))}
          </div>
          {/* golden birds */}
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
            {birds.map((b) => (
              <span
                key={b.id}
                className="absolute"
                style={{
                  top: `${b.top}%`,
                  left: 0,
                  fontSize: b.size,
                  filter: "drop-shadow(0 0 10px rgba(247,190,29,0.9)) hue-rotate(15deg) saturate(1.4)",
                  animation: `bird-fly ${b.duration}s linear ${b.delay}s infinite`,
                }}
              >
                <span
                  className="inline-block"
                  style={{
                    animation: `bird-flap ${b.flap}s ease-in-out infinite`,
                    transformOrigin: "center",
                  }}
                >
                  🕊️
                </span>
              </span>
            ))}
          </div>
          {/* floating flowers */}
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
            {flowers.map((f) => (
              <span
                key={f.id}
                className="absolute bottom-0"
                style={{
                  left: `${f.left}%`,
                  fontSize: f.size,
                  filter: "drop-shadow(0 0 6px rgba(247,190,29,0.5))",
                  animation: `flower-float ${f.duration}s linear ${f.delay}s infinite`,
                }}
              >
                {f.emoji}
              </span>
            ))}
          </div>
          {/* floating sparkles */}
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            {sparkles.map((s) => (
              <Star
                key={s.id}
                className="absolute text-[#f7be1d]"
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.size,
                  height: s.size,
                  fill: "#f7be1d",
                  filter: "drop-shadow(0 0 6px rgba(247,190,29,0.9))",
                  animation: `sparkle-float 2.6s ease-in-out ${s.delay}s infinite`,
                }}
              />
            ))}
          </div>

          <div className="relative bg-[#20201a] border-2 border-[#f7be1d] shadow-[0_0_60px_rgba(247,190,29,0.7)] rounded-md p-8 max-w-md text-center animate-[victory-pop_0.6s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-[#f7be1d]/30 animate-ping" />
              <Trophy
                className="relative w-20 h-20 text-[#f7be1d] animate-[trophy-bounce_1.4s_ease-in-out_infinite]"
                style={{ filter: "drop-shadow(0 0 16px rgba(247,190,29,1))" }}
              />
            </div>
            <h3 className="font-serif text-4xl mt-4 text-cream tracking-wide">
              <span className="inline-block animate-[fade-in_0.6s_ease-out_0.2s_both]">Victory,</span>{" "}
              <span className="inline-block text-[#f7be1d] animate-[fade-in_0.6s_ease-out_0.5s_both]">Wanderer!</span>
            </h3>
            <p className="font-serif text-base text-cream/80 mt-3 animate-[fade-in_0.6s_ease-out_0.8s_both]">
              The tavern erupts in cheers. You have mastered this round of conversation.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 animate-[fade-in_0.6s_ease-out_1s_both]">
              <Sparkles className="w-4 h-4 text-[#f7be1d]" />
              <span className="font-mono-label text-xs uppercase tracking-[0.3em] text-[#f7be1d]">+ 50 XP · + 10 Gold</span>
              <Sparkles className="w-4 h-4 text-[#f7be1d]" />
            </div>
            <button
              onClick={resetAll}
              className="mt-6 px-6 py-2.5 rounded border-2 border-black bg-[#f7be1d] text-[#1a0800] font-bold text-sm uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform animate-[fade-in_0.6s_ease-out_1.2s_both]"
            >
              Another Round
            </button>
          </div>
        </div>
      )}

      {/* === Lockout / Tavern Cooldown — fire & embers === */}
      {isLockedOut && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 overflow-hidden">
          {/* dark blurred backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 bg-surface/90 backdrop-blur-md animate-[fade-in_0.4s_ease-out]"
          />
          {/* heat haze gradient at the bottom */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at bottom, rgba(239,68,68,0.35) 0%, rgba(120,18,18,0.25) 30%, transparent 70%)",
              animation: "heat-flicker 2.4s ease-in-out infinite",
            }}
          />
          {/* rising embers */}
          <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
            {embers.map((e) => (
              <span
                key={e.id}
                className="absolute bottom-0 rounded-full"
                style={{
                  left: `${e.left}%`,
                  width: e.size,
                  height: e.size,
                  background:
                    "radial-gradient(circle, #fde68a 0%, #f7be1d 40%, #ef4444 80%, transparent 100%)",
                  filter: "blur(0.5px) drop-shadow(0 0 6px rgba(247,190,29,0.8))",
                  animation: `ember-rise ${e.duration}s linear ${e.delay}s infinite`,
                  opacity: 0,
                }}
              />
            ))}
          </div>

          <div className="relative max-w-lg text-center animate-[fade-in_0.6s_ease-out]">
            {/* dancing flame icons */}
            <div className="flex items-end justify-center gap-3 mb-4">
              {[0, 1, 2].map((i) => (
                <Flame
                  key={i}
                  className="text-[#ef4444]"
                  style={{
                    width: i === 1 ? 56 : 40,
                    height: i === 1 ? 56 : 40,
                    fill: "#f7be1d",
                    color: "#ef4444",
                    filter: "drop-shadow(0 0 14px rgba(239,68,68,0.9))",
                    animation: `flame-dance ${1.2 + i * 0.3}s ease-in-out ${i * 0.15}s infinite`,
                    transformOrigin: "bottom center",
                  }}
                />
              ))}
            </div>
            <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-[#ef4444]">⟢ Tavern Cooldown ⟣</p>
            <h3 className="font-serif text-3xl md:text-4xl mt-3 text-cream leading-snug">
              Your stamina is broken, Wanderer. You must recuperate before venturing back into the wilds.
            </h3>
            <div className="mt-8 inline-flex flex-col items-center gap-2">
              <span className="font-mono-label text-[10px] uppercase tracking-widest text-tertiary">Rest remaining</span>
              <span
                className="font-serif text-7xl text-[#f7be1d] tabular-nums animate-[pulse_1.5s_ease-in-out_infinite]"
                style={{ filter: "drop-shadow(0 0 16px rgba(247,190,29,0.8))" }}
              >
                {String(Math.floor(lockoutRemaining / 60)).padStart(1, "0")}:{String(lockoutRemaining % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
