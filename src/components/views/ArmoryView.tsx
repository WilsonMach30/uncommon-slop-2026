import { useEffect, useState } from "react";
import { Lock, Coins, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Item = { key: string; slot: string; label: string; emoji: string; cost: number };

const ITEMS: Item[] = [
  // Headwear
  { key: "wizard_hat",    slot: "Headwear", label: "Apprentice Hat",  emoji: "🧙", cost: 30  },
  { key: "feathered_cap", slot: "Headwear", label: "Feathered Cap",   emoji: "🎩", cost: 60  },
  { key: "crown_gold",    slot: "Headwear", label: "Gilded Crown",    emoji: "👑", cost: 200 },
  // Back
  { key: "explorer_cape", slot: "Back",     label: "Explorer's Cape", emoji: "🧥", cost: 40  },
  { key: "shadow_cloak",  slot: "Back",     label: "Shadow Cloak",    emoji: "🦇", cost: 120 },
  { key: "starlight_cloak", slot: "Back",   label: "Starlight Cloak", emoji: "✨", cost: 250 },
  // Main hand
  { key: "scribe_quill",  slot: "Main Hand",label: "Scribe's Quill",  emoji: "🪶", cost: 25  },
  { key: "iron_sword",    slot: "Main Hand",label: "Iron Sword",      emoji: "⚔️", cost: 80  },
  { key: "rune_staff",    slot: "Main Hand",label: "Runed Staff",     emoji: "🪄", cost: 150 },
];

export default function ArmoryView({ profileId, gold, onGoldChange }: {
  profileId: string;
  gold: number;
  onGoldChange: (next: number) => void;
}) {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Item | null>(null);

  useEffect(() => {
    supabase.from("unlocked_cosmetics").select("item_key").eq("profile_id", profileId)
      .then(({ data }) => {
        if (data) setUnlocked(new Set(data.map((d) => d.item_key)));
      });
  }, [profileId]);

  const purchase = async () => {
    if (!confirm) return;
    if (gold < confirm.cost) {
      toast.error("Not enough Gold Tokens to forge this gear.");
      return;
    }
    const nextGold = gold - confirm.cost;
    onGoldChange(nextGold);
    setUnlocked((prev) => new Set(prev).add(confirm.key));

    await Promise.all([
      supabase.from("profiles").update({ gold_tokens: nextGold }).eq("id", profileId),
      supabase.from("unlocked_cosmetics").insert({
        profile_id: profileId, slot: confirm.slot, item_key: confirm.key,
      }),
    ]);
    toast.success(`Unlocked: ${confirm.label}`);
    setConfirm(null);
  };

  const slots = ["Headwear", "Back", "Main Hand"];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-tertiary">⟢ Cosmetic Forge ⟣</p>
          <h2 className="font-serif text-3xl text-cream mt-1">The Armory</h2>
          <p className="text-xs text-muted-foreground mt-1">Style your wanderer · purely cosmetic</p>
        </div>
        <div className="panel-bark border-2 border-tertiary rounded-full px-4 py-2 flex items-center gap-2 glow-gold">
          <Coins className="w-4 h-4 text-tertiary" />
          <span className="font-serif text-lg text-cream">{gold}</span>
          <span className="font-mono-label text-[10px] uppercase tracking-widest text-muted-foreground">Gold</span>
        </div>
      </header>

      <div className="space-y-6">
        {slots.map((slot) => (
          <section key={slot}>
            <h3 className="font-mono-label text-[11px] uppercase tracking-[0.3em] text-tertiary mb-3">
              {slot}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {ITEMS.filter((i) => i.slot === slot).map((item) => {
                const owned = unlocked.has(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => !owned && setConfirm(item)}
                    className={`relative aspect-square rounded-md border-2 panel-bark p-2 flex flex-col items-center justify-center transition-transform hover:-translate-y-0.5 ${
                      owned
                        ? "border-[#4ade80] glow-cosmetic cursor-default"
                        : "border-bark hover:border-tertiary/60"
                    }`}
                  >
                    <span className={`text-3xl sm:text-4xl ${owned ? "" : "opacity-50"}`}>{item.emoji}</span>
                    <span className="font-mono-label text-[9px] uppercase tracking-wider text-cream mt-1 text-center leading-tight">
                      {item.label}
                    </span>
                    {!owned ? (
                      <>
                        <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                          <Lock className="w-5 h-5 text-tertiary/80" />
                        </div>
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 panel-bark border border-tertiary rounded-full px-2 py-0.5 font-mono-label text-[9px] text-tertiary flex items-center gap-1">
                          <Coins className="w-2.5 h-2.5" /> {item.cost}
                        </span>
                      </>
                    ) : (
                      <span className="absolute top-1 right-1 text-[#4ade80]">
                        <Sparkles className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
          <div
            className="panel-bark border-2 border-tertiary rounded-xl shadow-panel max-w-sm w-full p-6 glow-gold relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setConfirm(null)} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-surface-low text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-6xl block mb-2">{confirm.emoji}</span>
              <p className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-tertiary">{confirm.slot}</p>
              <h3 className="font-serif text-2xl text-cream mt-1">{confirm.label}</h3>
              <p className="text-sm text-muted-foreground mt-4">
                Purchase this cosmetic upgrade for{" "}
                <span className="text-tertiary font-mono-label inline-flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" /> {confirm.cost}
                </span>{" "}
                Gold Tokens?
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                You currently hold {gold} gold.
              </p>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 px-4 py-2.5 panel-bark border-2 border-bark rounded-full font-mono-label text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={purchase}
                  disabled={gold < confirm.cost}
                  className="flex-1 px-4 py-2.5 bg-tertiary text-tertiary-foreground rounded-full font-serif border-2 border-tertiary-container glow-gold disabled:opacity-40 disabled:glow-gold"
                >
                  Forge it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
