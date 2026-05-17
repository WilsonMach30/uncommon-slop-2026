import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type MCQ = { question: string; options: string[]; answer: number };
type ReadingData = { reading_text: string; multiple_choice: MCQ[]; short_answer: string[] };

export default function ReadingView({
  level = 1,
  language = "Arabic",
  interests = "Daily life, technology, history",
  onCorrect,
  onWrong,
  disabled,
}: {
  level?: number;
  language?: string;
  interests?: string;
  onCorrect: () => void;
  onWrong: () => void;
  disabled: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ReadingData | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);

  // useEffect(() => {
  //   setLoading(true);
  //   setError("");
  //   fetch("http://127.0.0.1:5002/generate-reading", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ level, language, interests }),
  //   })
  //     .then((r) => r.json())
  //     .then((res) => {
  //       if (res.error) throw new Error(res.error);
  //       const parsed: ReadingData = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  //       setData(parsed);
  //     })
  //     .catch((e) => setError(e.message ?? "Failed to load reading"))
  //     .finally(() => setLoading(false));
  // }, [level, language, interests]);
  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("http://127.0.0.1:5002/generate-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, language, interests }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        
        // Extract the nested structured data returned from your endpoint wrapper
        let readingPayload = res.data;
        
        // If the backend sent back a serialized text string block, convert it back to an object
        if (typeof readingPayload === "string") {
            readingPayload = JSON.parse(readingPayload);
        }
        
        setData(readingPayload);
      })
      .catch((e) => setError(e.message ?? "Failed to load reading"))
      .finally(() => setLoading(false));
  }, [level, language, interests]);

  const checkAnswers = () => {
    if (!data) return;
    let correct = 0;
    data.multiple_choice.forEach((q, i) => {
      if (selected[i] === q.answer) correct++;
    });
    setRevealed(true);
    if (correct >= 2) onCorrect();
    else onWrong();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12 gap-3 text-tertiary">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="font-mono-label text-xs uppercase tracking-widest">Generating passage…</span>
    </div>
  );

  if (error) return (
    <p className="text-red-400 font-mono-label text-xs uppercase tracking-wider text-center py-8">{error}</p>
  );

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Reading passage */}
      <div className="panel-carved rounded-md border-2 border-bark p-4">
        <p className="font-mono-label text-[9px] uppercase tracking-widest text-tertiary mb-3">Passage</p>
        <p className="font-serif text-base leading-relaxed text-cream whitespace-pre-wrap">{data.reading_text}</p>
      </div>

      {/* Multiple choice */}
      <div className="flex flex-col gap-4">
        <p className="font-mono-label text-[9px] uppercase tracking-widest text-tertiary">Multiple Choice</p>
        {data.multiple_choice.map((q, qi) => (
          <div key={qi} className="flex flex-col gap-2">
            <p className="font-serif text-sm text-cream">{qi + 1}. {q.question}</p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const isSelected = selected[qi] === oi;
                const isCorrect = revealed && oi === q.answer;
                const isWrong = revealed && isSelected && oi !== q.answer;
                return (
                  <button
                    key={oi}
                    disabled={disabled || revealed}
                    onClick={() => setSelected((s) => ({ ...s, [qi]: oi }))}
                    className={`text-left px-4 py-2 rounded border-2 font-serif text-sm transition-colors
                      ${isCorrect ? "border-green-500 bg-green-950/40 text-green-300" :
                        isWrong ? "border-red-500 bg-red-950/40 text-red-300" :
                        isSelected ? "border-tertiary bg-[#2a2a22]" :
                        "border-bark bg-[#2a2a22] hover:border-tertiary/60"}
                      disabled:opacity-60`}
                  >
                    <span className="font-mono-label text-[10px] text-tertiary mr-2">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Short answer */}
      <div className="flex flex-col gap-4">
        <p className="font-mono-label text-[9px] uppercase tracking-widest text-tertiary">Short Answer</p>
        {data.short_answer.map((q, qi) => (
          <div key={qi} className="flex flex-col gap-2">
            <p className="font-serif text-sm text-cream">{q}</p>
            <textarea
              disabled={disabled}
              value={shortAnswers[qi] ?? ""}
              onChange={(e) => setShortAnswers((s) => ({ ...s, [qi]: e.target.value }))}
              rows={2}
              className="w-full bg-[#1a1a14] border-2 border-bark rounded p-2 font-serif text-sm text-cream resize-none focus:border-tertiary outline-none"
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      {!revealed && (
        <button
          onClick={checkAnswers}
          disabled={disabled || Object.keys(selected).length < data.multiple_choice.length}
          className="px-6 py-2.5 rounded border-2 border-black bg-[#f7be1d] text-[#1a0800] font-bold text-xs uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform disabled:opacity-40"
        >
          Submit Answers
        </button>
      )}
    </div>
  );
}
