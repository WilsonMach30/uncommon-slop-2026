import { useEffect, useRef, useState } from "react";
import { X, Volume2, Mic, MicOff, Loader2 } from "lucide-react";

type Turn = {
  speaker: string;
  track: string;
  text: string;
  choices: { id: string; label: string }[];
};

export default function DialogueBox({
  track, location, theme, userInput, onClose,
}: {
  track: string; location: string; theme?: string; userInput?: string; onClose: () => void;
}) {
  const [turn, setTurn] = useState<Turn | null>(null);
  const [loading, setLoading] = useState(true);
  const [typed, setTyped] = useState("");
  const [recording, setRecording] = useState(false);
  const [responding, setResponding] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const responseAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/generate-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track, location, theme, userInput }),
    })
      .then((r) => r.json())
      .then((data: Turn) => { if (!cancelled) { setTurn(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [track, location, theme, userInput]);

  // Typewriter effect for character text
  useEffect(() => {
    if (!turn) return;
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setTyped(turn.text.slice(0, i));
      if (i >= turn.text.length) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [turn]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        setResponding(true);
        try {
          const res = await fetch("http://127.0.0.1:5000/respond-to-voice", { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const audioBlob = await res.blob();
          const url = URL.createObjectURL(audioBlob);
          if (responseAudioRef.current) {
            responseAudioRef.current.src = url;
            responseAudioRef.current.play();
          }
        } catch (err) {
          console.error("Voice pipeline error:", err);
        } finally {
          setResponding(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  const isSpeaking = track === "speaking";

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="panel-bark border-2 border-tertiary rounded-xl shadow-panel w-full max-w-2xl glow-gold animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-bark">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-tertiary flex items-center justify-center text-tertiary font-serif glow-gold shrink-0">
              {(turn?.speaker ?? "?").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-mono-label text-[9px] uppercase tracking-[0.3em] text-tertiary">{track} track</p>
              <p className="font-serif text-base text-cream truncate">{turn?.speaker ?? "…"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-low text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dialogue text — classic RPG box */}
        <div className="px-5 py-5">
          <div className="panel-carved rounded-md border-2 border-bark p-4 sm:p-5 min-h-[120px]">
            <p className="font-serif text-base sm:text-lg leading-relaxed text-cream">
              {loading ? "…" : typed}
              <span className="inline-block w-2 h-4 ml-0.5 bg-tertiary align-middle animate-pulse" />
            </p>
          </div>
        </div>

        {/* Speaking track — unified mic + equalizer bar */}
        {isSpeaking && (
          <div className="px-5 pb-4">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={responding}
              className={`group w-full flex items-center gap-3 px-3 py-3 panel-carved rounded-md border-2 transition-all select-none ${
                recording
                  ? "border-red-500 bg-red-950/40"
                  : responding
                  ? "border-bark opacity-70 cursor-not-allowed"
                  : "border-bark hover:border-tertiary"
              }`}
            >
              {/* Inline mic affordance */}
              <span
                className={`shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all ${
                  recording
                    ? "bg-red-600 border-red-300 animate-pulse"
                    : responding
                    ? "bg-surface-low border-bark"
                    : "bg-tertiary border-tertiary-container glow-gold group-hover:scale-105 group-active:scale-95"
                }`}
              >
                {responding ? (
                  <Loader2 className="w-5 h-5 animate-spin text-cream" />
                ) : recording ? (
                  <MicOff className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-tertiary-foreground" />
                )}
              </span>

              {/* Equalizer doubles as live-audio feedback */}
              <div className="flex-1 flex items-end gap-1 h-8">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-full transition-colors ${
                      recording ? "bg-red-400" : responding ? "bg-muted-foreground/40" : "bg-tertiary/70"
                    } ${recording || responding ? "animate-pulse" : ""}`}
                    style={{
                      height: recording || responding
                        ? `${25 + ((i * 37) % 70)}%`
                        : `${15 + ((i % 5) * 8)}%`,
                      animationDelay: `${i * 70}ms`,
                      animationDuration: "700ms",
                    }}
                  />
                ))}
              </div>

              {/* Status label */}
              <span className="shrink-0 font-mono-label text-[9px] uppercase tracking-[0.25em] text-tertiary min-w-[64px] text-right">
                {responding ? "Thinking" : recording ? "Release" : "Hold · Speak"}
              </span>
            </button>
            <audio ref={responseAudioRef} hidden />
          </div>
        )}

        {/* Choices */}
        <div className="px-5 pb-5 grid gap-2">
          {(turn?.choices ?? []).map((c) => (
            <button
              key={c.id}
              className="w-full text-left px-4 py-3 panel-bark border-2 border-bark rounded-md hover:border-tertiary transition-colors font-serif text-sm text-cream"
            >
              <span className="text-tertiary font-mono-label text-[10px] uppercase tracking-widest mr-2">▸</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
