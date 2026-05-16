import { useEffect, useRef, useState } from "react";
import { Megaphone, Feather, BookOpen, X, Sparkles, Flame, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logEngagement } from "@/lib/profile";
import { submitTrialImage } from "@/lib/submit-trial-image";

type Loc = { name: string; subtitle: string; icon: any; tagline: string };

const TRACKS = [
  {
    id: "speaking",
    label: "Speaking Track",
    sub: "Voice Quest",
    icon: Megaphone,
    desc: "Talk to the locals.",
  },
  {
    id: "reading",
    label: "Reading Track",
    sub: "Scroll Deciphering",
    icon: BookOpen,
    desc: "Decipher the runes.",
  },
  {
    id: "writing",
    label: "Writing Track",
    sub: "Runic Inscription",
    icon: Feather,
    desc: "Scribe a tale.",
  },
];

export default function QuestPanel({
  location,
  onClose,
  profileId,
  progress,
  onStartTrack,
}: {
  location: Loc;
  onClose: () => void;
  profileId: string;
  progress: number;
  onStartTrack: (track: string, input: string) => void;
}) {
  const [input, setInput] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBrasserie = location.name === "The Brasserie";

  useEffect(() => {
    // trigger enter animation
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImagePick = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 200);
  };

  const start = async (track: string) => {
    setChosen(track);
    await logEngagement(profileId, {
      event_type: "quest_started",
      location_name: location.name,
      track,
      session_input: input,
      duration_seconds: 0,
    });
  };

  const launch = async () => {
    if (!chosen || submitting) return;

    if (isBrasserie) {
      if (!imageFile) {
        toast.error("Upload an image to begin your Brasserie trial.");
        return;
      }
      if (!input.trim()) {
        toast.error("Describe your image in the field below.");
        return;
      }

      setSubmitting(true);
      try {
        await submitTrialImage(imageFile, input);
        toast.success("Your trial has been recorded in the archives.");
      } catch (err) {
        console.error("[Brasserie trial]", err);
        toast.error("Could not save your trial. Check your connection and try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    onStartTrack(chosen, input);
    handleClose();
  };

  const Icon = location.icon;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 flex items-end justify-center ${mounted ? "opacity-100" : "opacity-0"}`}
      onClick={handleClose}
    >
      <div
        className={`panel-bark border-t-4 border-x-4 border-tertiary rounded-t-2xl shadow-panel max-w-lg w-full max-h-[90vh] overflow-y-auto glow-gold transform transition-transform duration-300 ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="pt-2 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-tertiary/60" />
        </div>

        <div className="relative px-6 pt-4 pb-5 text-center border-b-2 border-bark">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-surface-low text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          {isBrasserie ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  handleImagePick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group mx-auto mb-3 block"
                aria-label="Upload an image for your trial"
              >
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary bg-primary-container glow-emerald transition-transform group-hover:scale-105">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Your trial image"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-primary">
                      <ImagePlus className="w-7 h-7" />
                      <span className="font-mono-label text-[8px] uppercase tracking-wider">
                        Add image
                      </span>
                    </div>
                  )}
                </div>
              </button>
              <p className="font-mono-label text-[9px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                Tap above to upload your scene
              </p>
            </>
          ) : (
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary-container border-2 border-primary flex items-center justify-center text-primary glow-emerald">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary mb-1">
            {location.subtitle}
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl leading-tight">
            Welcome to the
            <br />
            <span className="text-tertiary">{location.name}</span>
          </h2>
          <p className="text-muted-foreground text-xs mt-3 italic font-serif">
            "{location.tagline}" — choose your path, traveler.
          </p>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary block mb-2">
              {isBrasserie ? "⟢ Describe your image" : "⟢ What will you explore?"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isBrasserie
                  ? "Describe what is happening in your image…"
                  : "e.g. Ordering coffee, ancient swords…"
              }
              className="w-full bg-surface-low border-2 border-bark focus:border-tertiary outline-none rounded-md p-3 text-sm font-mono-label min-h-[70px] text-cream placeholder:text-muted-foreground/60 shadow-carved"
            />
          </div>

          <div className="space-y-2.5">
            {TRACKS.map((t) => {
              const TIcon = t.icon;
              const active = chosen === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => start(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-md border-2 transition-all ${
                    active
                      ? "panel-bark border-primary glow-emerald"
                      : "bg-surface-low border-bark hover:border-tertiary/60"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-surface border-bark text-tertiary"
                    }`}
                  >
                    <TIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-base leading-tight">{t.label}</h3>
                    <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
                      ({t.sub})
                    </p>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border-2 ${active ? "bg-primary border-primary" : "border-bark"}`}
                  />
                </button>
              );
            })}
          </div>

          {chosen && (
            <div className="panel-bark border-2 border-primary rounded-md p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your tutor will tailor a <span className="text-cream">{chosen}</span> quest around
                {input ? (
                  <>
                    {" "}
                    <span className="text-tertiary font-mono-label">"{input}"</span>
                  </>
                ) : (
                  " your chosen theme"
                )}
                .
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary">
                Daily Adventure
              </p>
              <p className="font-mono-label text-[10px] text-cream">{progress}%</p>
            </div>
            <div className="h-2 rounded-full bg-surface-low border border-bark overflow-hidden">
              <div className="h-full vial-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <button
            disabled={!chosen || submitting}
            onClick={() => void launch()}
            className="w-full flex items-center justify-center gap-2 bg-tertiary text-tertiary-foreground font-serif rounded-full py-3 border-2 border-tertiary-container glow-gold disabled:opacity-40 disabled:glow-gold transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving trial…
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" /> Commence Trial
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
