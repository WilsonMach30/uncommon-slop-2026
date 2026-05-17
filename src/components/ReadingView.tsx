import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Check, X, BookOpen, Sparkles, ArrowRight } from "lucide-react";

type MCQ = { question: string; options: string[]; answer: number; explanation?: string };
type SAQ = { question: string; model_answer: string };
type ReadingPack = { reading_text: string; multiple_choice: MCQ[]; short_answer: SAQ[] };

type Step =
  | { kind: "mcq"; index: number }
  | { kind: "saq"; index: number };

type Result = {
  step: Step;
  question: string;
  user_answer: string;
  model_answer: string;
  correct: boolean;
  feedback?: string;
  improvement?: string;
};

export type ReadingOutcome = {
  victory: boolean;
  results: Result[];
  passage: string;
};

export default function ReadingView({
  language = "Spanish",
  onCorrect,
  onWrong,
  onComplete,
  disabled,
  livesRemaining,
}: {
  language?: string;
  onCorrect: () => void;
  onWrong: () => void;
  onComplete: (outcome: ReadingOutcome) => void;
  disabled: boolean;
  livesRemaining: number;
}) {
  const [pack, setPack] = useState<ReadingPack | null>(null);
  const [error, setError] = useState("");
  const [stepIdx, setStepIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState("");
  const [judging, setJudging] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; feedback?: string; improvement?: string } | null>(null);
  const [showPassage, setShowPassage] = useState(true);
  const resultsRef = useRef<Result[]>([]);
  const completedRef = useRef(false);

  // Load pack from sessionStorage (populated by map before navigating)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("reading_pack");
      if (!raw) {
        setError("No reading scroll was prepared. Return to the map and start the trial again.");
        return;
      }
      const parsed: ReadingPack = JSON.parse(raw);
      setPack(parsed);
    } catch (e) {
      setError("The scroll was unreadable. Return to the map and try again.");
    }
  }, []);

  const steps = useMemo<Step[]>(() => {
    if (!pack) return [];
    return [
      ...pack.multiple_choice.map((_, i) => ({ kind: "mcq" as const, index: i })),
      ...pack.short_answer.map((_, i) => ({ kind: "saq" as const, index: i })),
    ];
  }, [pack]);

  // When lives run out elsewhere, end the run as defeat.
  useEffect(() => {
    if (livesRemaining <= 0 && pack && !completedRef.current) {
      completedRef.current = true;
      onComplete({ victory: false, results: resultsRef.current, passage: pack.reading_text });
    }
  }, [livesRemaining, pack, onComplete]);

  if (error) {
    return <p className="text-red-400 font-mono-label text-xs uppercase tracking-wider text-center py-8">{error}</p>;
  }
  if (!pack) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-tertiary">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="font-mono-label text-xs uppercase tracking-widest">Unrolling scroll…</span>
      </div>
    );
  }

  const step = steps[stepIdx];
  if (!step) return null;

  const advance = () => {
    setSelectedOption(null);
    setShortAnswer("");
    setFeedback(null);
    const nextIdx = stepIdx + 1;
    if (nextIdx >= steps.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete({ victory: true, results: resultsRef.current, passage: pack.reading_text });
      }
    } else {
      setStepIdx(nextIdx);
    }
  };

  const submitMcq = () => {
    if (selectedOption == null) return;
    const q = pack.multiple_choice[step.index];
    const correct = selectedOption === q.answer;
    const modelText = q.options[q.answer] ?? "";
    resultsRef.current.push({
      step,
      question: q.question,
      user_answer: q.options[selectedOption] ?? "",
      model_answer: modelText,
      correct,
      feedback: q.explanation,
    });
    setFeedback({ correct, feedback: q.explanation });
    if (correct) onCorrect();
    else onWrong();
  };

  const submitSaq = async () => {
    const q = pack.short_answer[step.index];
    if (!shortAnswer.trim()) return;
    setJudging(true);
    try {
      const res = await fetch("/api/judge-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          model_answer: q.model_answer,
          user_answer: shortAnswer,
          passage: pack.reading_text.slice(0, 600),
          language,
        }),
      });
      const data = await res.json();
      const correct = Boolean(data?.correct);
      resultsRef.current.push({
        step,
        question: q.question,
        user_answer: shortAnswer,
        model_answer: q.model_answer,
        correct,
        feedback: data?.feedback,
        improvement: data?.improvement,
      });
      setFeedback({ correct, feedback: data?.feedback, improvement: data?.improvement });
      if (correct) onCorrect();
      else onWrong();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Judge failed";
      setFeedback({ correct: false, feedback: msg });
      resultsRef.current.push({
        step,
        question: q.question,
        user_answer: shortAnswer,
        model_answer: q.model_answer,
        correct: false,
        feedback: msg,
      });
      onWrong();
    } finally {
      setJudging(false);
    }
  };

  const stepLabel = step.kind === "mcq"
    ? `Multiple Choice ${step.index + 1} / ${pack.multiple_choice.length}`
    : `Short Answer ${step.index + 1} / ${pack.short_answer.length}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Passage (collapsible to keep questions focused) */}
      <div className="panel-carved rounded-md border-2 border-bark">
        <button
          type="button"
          onClick={() => setShowPassage((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-2 text-left"
        >
          <span className="flex items-center gap-2 font-mono-label text-[10px] uppercase tracking-widest text-tertiary">
            <BookOpen className="w-3.5 h-3.5" /> Passage
          </span>
          <span className="font-mono-label text-[10px] text-tertiary">{showPassage ? "Hide" : "Show"}</span>
        </button>
        {showPassage && (
          <p className="px-4 pb-4 font-serif text-base leading-relaxed text-cream whitespace-pre-wrap">
            {pack.reading_text}
          </p>
        )}
      </div>

      {/* Current question */}
      <div className="flex flex-col gap-3">
        <p className="font-mono-label text-[10px] uppercase tracking-widest text-tertiary">{stepLabel}</p>

        {step.kind === "mcq" ? (
          <>
            <p className="font-serif text-base text-cream">{pack.multiple_choice[step.index].question}</p>
            <div className="grid gap-2">
              {pack.multiple_choice[step.index].options.map((opt, oi) => {
                const q = pack.multiple_choice[step.index];
                const isSelected = selectedOption === oi;
                const revealed = feedback != null;
                const isCorrect = revealed && oi === q.answer;
                const isWrong = revealed && isSelected && oi !== q.answer;
                return (
                  <button
                    key={oi}
                    disabled={disabled || revealed}
                    onClick={() => setSelectedOption(oi)}
                    className={`text-left px-4 py-2 rounded border-2 font-serif text-sm transition-colors
                      ${isCorrect ? "border-green-500 bg-green-950/40 text-green-300" :
                        isWrong ? "border-red-500 bg-red-950/40 text-red-300" :
                        isSelected ? "border-tertiary bg-[#2a2a22]" :
                        "border-bark bg-[#2a2a22] hover:border-tertiary/60"} disabled:opacity-60`}
                  >
                    <span className="font-mono-label text-[10px] text-tertiary mr-2">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="font-serif text-base text-cream">{pack.short_answer[step.index].question}</p>
            <textarea
              disabled={disabled || feedback != null || judging}
              value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)}
              rows={3}
              placeholder={`Answer in ${language}…`}
              className="w-full bg-[#1a1a14] border-2 border-bark rounded p-2 font-serif text-sm text-cream resize-none focus:border-tertiary outline-none disabled:opacity-60"
            />
          </>
        )}

        {feedback && (
          <div className={`rounded border-2 p-3 ${feedback.correct ? "border-green-500/60 bg-green-950/30" : "border-red-500/60 bg-red-950/30"}`}>
            <p className={`font-mono-label text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5 ${feedback.correct ? "text-green-300" : "text-red-300"}`}>
              {feedback.correct ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {feedback.correct ? "Correct" : "Not quite"}
            </p>
            {feedback.feedback && <p className="font-serif text-sm text-cream">{feedback.feedback}</p>}
            {step.kind === "saq" && (
              <p className="font-serif text-xs text-cream/80 mt-2">
                <span className="font-mono-label text-[9px] uppercase tracking-widest text-tertiary mr-1">Model:</span>
                {pack.short_answer[step.index].model_answer}
              </p>
            )}
            {feedback.improvement && (
              <p className="font-serif text-xs text-tertiary/90 mt-2 flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {feedback.improvement}
              </p>
            )}
          </div>
        )}

        {feedback ? (
          <button
            onClick={advance}
            disabled={disabled}
            className="self-end flex items-center gap-2 px-5 py-2 rounded border-2 border-black bg-[#f7be1d] text-[#1a0800] font-bold text-xs uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform disabled:opacity-40"
          >
            {stepIdx + 1 >= steps.length ? "Finish Trial" : "Next"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : step.kind === "mcq" ? (
          <button
            onClick={submitMcq}
            disabled={disabled || selectedOption == null}
            className="self-end px-5 py-2 rounded border-2 border-black bg-[#f7be1d] text-[#1a0800] font-bold text-xs uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform disabled:opacity-40"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={submitSaq}
            disabled={disabled || !shortAnswer.trim() || judging}
            className="self-end flex items-center gap-2 px-5 py-2 rounded border-2 border-black bg-[#f7be1d] text-[#1a0800] font-bold text-xs uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform disabled:opacity-40"
          >
            {judging ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Judging…</> : "Submit Answer"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ReadingResultsScreen({
  outcome,
  onClose,
}: {
  outcome: ReadingOutcome;
  onClose: () => void;
}) {
  const correctCount = outcome.results.filter((r) => r.correct).length;
  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full panel-bark border-4 border-tertiary rounded-2xl shadow-panel my-8 p-6">
        <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary text-center">⟢ Trial Review ⟣</p>
        <h2 className="font-serif text-3xl text-center text-cream mt-2">
          {outcome.victory ? "Mastered" : "Reflect & Try Again"}
        </h2>
        <p className="font-serif text-sm text-muted-foreground text-center mt-1">
          You answered <span className="text-tertiary">{correctCount}</span> of {outcome.results.length} correctly.
        </p>

        <div className="mt-6 panel-carved rounded border-2 border-bark p-4">
          <p className="font-mono-label text-[10px] uppercase tracking-widest text-tertiary mb-2">Passage</p>
          <p className="font-serif text-sm leading-relaxed text-cream whitespace-pre-wrap">{outcome.passage}</p>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {outcome.results.map((r, i) => (
            <div
              key={i}
              className={`rounded border-2 p-3 ${r.correct ? "border-green-500/50 bg-green-950/20" : "border-red-500/50 bg-red-950/20"}`}
            >
              <p className={`font-mono-label text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5 ${r.correct ? "text-green-300" : "text-red-300"}`}>
                {r.correct ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                Q{i + 1} · {r.step.kind === "mcq" ? "Multiple Choice" : "Short Answer"}
              </p>
              <p className="font-serif text-sm text-cream">{r.question}</p>
              <div className="mt-2 grid gap-1.5 text-xs font-serif">
                <p><span className="font-mono-label text-[9px] uppercase tracking-widest text-tertiary mr-1">Your answer:</span><span className="text-cream/90">{r.user_answer || "(blank)"}</span></p>
                <p><span className="font-mono-label text-[9px] uppercase tracking-widest text-tertiary mr-1">Model:</span><span className="text-cream/90">{r.model_answer}</span></p>
                {r.feedback && <p className="text-cream/80 italic">— {r.feedback}</p>}
                {r.improvement && (
                  <p className="text-tertiary/90 flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {r.improvement}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-6 py-3 rounded border-2 border-black bg-[#f7be1d] text-[#1a0800] font-bold text-sm uppercase tracking-wider shadow-hard hover:-translate-y-0.5 transition-transform"
        >
          Return to the Map
        </button>
      </div>
    </div>
  );
}
