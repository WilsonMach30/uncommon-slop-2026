import { useEffect, useMemo, useState } from "react";
import { Heart, Check, X, Trophy, ArrowLeft, Flame, Sparkles, Star } from "lucide-react";

const TOTAL_STEPS = 5;
const LOCKOUT_SECONDS = 30;

export default function QuestRunner({ onExit }: { onExit?: () => void }) {
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

  // Confetti sparkle positions for victory (stable per mount)
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

  // Fire embers for lockout
  const embers = useMemo(
    () => Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 3,
      size: 4 + Math.random() * 10,
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="bg-[#20201a] border-2 border-[#f7be1d] shadow-[0_0_40px_rgba(247,190,29,0.5)] rounded-md p-8 max-w-md text-center">
            <Trophy className="w-16 h-16 mx-auto text-[#f7be1d]" style={{ filter: "drop-shadow(0 0 12px rgba(247,190,29,0.8))" }} />
            <h3 className="font-serif text-3xl mt-4 text-cream">Victory, Wanderer!</h3>
            <p className="font-serif text-base text-muted-foreground mt-2">
              The tavern erupts in cheers. You have mastered this round of conversation.
            </p>
            <button
              onClick={resetAll}
              className="mt-6 px-6 py-2.5 rounded border-2 border-black bg-[#f7be1d] text-[#1a0800] font-bold text-sm uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform"
            >
              Another Round
            </button>
          </div>
        </div>
      )}

      {/* === Lockout modal === */}
      {isLockedOut && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-surface/85 backdrop-blur-md p-6">
          <div className="max-w-lg text-center">
            <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary">⟢ Tavern Cooldown ⟣</p>
            <h3 className="font-serif text-3xl md:text-4xl mt-3 text-cream leading-snug">
              Your stamina is broken, Wanderer. You must recuperate before venturing back into the wilds.
            </h3>
            <div className="mt-8 inline-flex flex-col items-center gap-2">
              <span className="font-mono-label text-[10px] uppercase tracking-widest text-tertiary">Rest remaining</span>
              <span
                className="font-serif text-7xl text-[#f7be1d] tabular-nums"
                style={{ filter: "drop-shadow(0 0 12px rgba(247,190,29,0.6))" }}
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
