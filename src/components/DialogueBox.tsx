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

        {/* Audio equalizer (speaking only) */}
        {isSpeaking && (
          <div className="px-5 pt-4 flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-primary" />
            <div className="flex items-end gap-1 h-6">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <span
                  key={i}
                  className="w-1.5 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${30 + (i % 4) * 18}%`,
                    animationDelay: `${i * 90}ms`,
                    animationDuration: "900ms",
                  }}
                />
              ))}
            </div>
            <span className="font-mono-label text-[10px] uppercase tracking-widest text-primary">Live audio</span>
          </div>
        )}

        {/* Dialogue text — classic RPG box */}
        <div className="px-5 py-5">
          <div className="panel-carved rounded-md border-2 border-bark p-4 sm:p-5 min-h-[120px]">
            <p className="font-serif text-base sm:text-lg leading-relaxed text-cream">
              {loading ? "…" : typed}
              <span className="inline-block w-2 h-4 ml-0.5 bg-tertiary align-middle animate-pulse" />
            </p>
          </div>
        </div>

        {/* Voice record button */}
        <div className="px-5 pb-4 flex flex-col items-center gap-2">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={responding}
            className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all select-none ${
              recording
                ? "bg-red-600 border-red-400 scale-110 animate-pulse"
                : responding
                ? "bg-surface-low border-bark cursor-not-allowed"
                : "bg-tertiary border-tertiary-container glow-gold hover:scale-105 active:scale-95"
            }`}
          >
            {responding ? (
              <Loader2 className="w-7 h-7 animate-spin text-cream" />
            ) : recording ? (
              <MicOff className="w-7 h-7 text-white" />
            ) : (
              <Mic className="w-7 h-7 text-tertiary-foreground" />
            )}
          </button>
          <p className="font-mono-label text-[10px] uppercase tracking-widest text-muted-foreground">
            {responding ? "Thinking…" : recording ? "Release to send" : "Hold to speak"}
          </p>
          <audio ref={responseAudioRef} hidden />
        </div>

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
