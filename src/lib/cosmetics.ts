// Shared cosmetic catalog + equipped-state helpers (persisted in localStorage,
// keyed per profile so the Me tab and Armory stay in sync without a migration).

export type Slot = "Headwear" | "Back" | "Main Hand";

export type CosmeticItem = {
  key: string;
  slot: Slot;
  label: string;
  emoji: string;
  cost: number;
};

export const ITEMS: CosmeticItem[] = [
  // Headwear
  { key: "wizard_hat",      slot: "Headwear",  label: "Apprentice Hat",  emoji: "🧙", cost: 30  },
  { key: "feathered_cap",   slot: "Headwear",  label: "Feathered Cap",   emoji: "🎩", cost: 60  },
  { key: "crown_gold",      slot: "Headwear",  label: "Gilded Crown",    emoji: "👑", cost: 200 },
  // Back
  { key: "explorer_cape",   slot: "Back",      label: "Explorer's Cape", emoji: "🧥", cost: 40  },
  { key: "shadow_cloak",    slot: "Back",      label: "Shadow Cloak",    emoji: "🦇", cost: 120 },
  { key: "starlight_cloak", slot: "Back",      label: "Starlight Cloak", emoji: "✨", cost: 250 },
  // Main hand
  { key: "scribe_quill",    slot: "Main Hand", label: "Scribe's Quill",  emoji: "🪶", cost: 25  },
  { key: "iron_sword",      slot: "Main Hand", label: "Iron Sword",      emoji: "⚔️", cost: 80  },
  { key: "rune_staff",      slot: "Main Hand", label: "Runed Staff",     emoji: "🪄", cost: 150 },
];

export const ITEM_BY_KEY: Record<string, CosmeticItem> =
  Object.fromEntries(ITEMS.map((i) => [i.key, i]));

export const SLOTS: Slot[] = ["Headwear", "Back", "Main Hand"];

export type CharacterTemplate = {
  key: string;
  emoji: string;
  name: string;
  title: string;
};

export const TEMPLATES: CharacterTemplate[] = [
  { key: "bard",     emoji: "🧝", name: "Wilson",  title: "the Aspiring Bard" },
  { key: "mage",     emoji: "🧙", name: "Calla",   title: "the Hedge Mage" },
  { key: "ranger",   emoji: "🏹", name: "Rook",    title: "the Forest Ranger" },
  { key: "scholar",  emoji: "📚", name: "Iris",    title: "the Scroll Scholar" },
  { key: "knight",   emoji: "🛡️", name: "Brom",    title: "the Squire Errant" },
  { key: "trickster",emoji: "🦊", name: "Vix",     title: "the Trickster" },
  { key: "dragon",   emoji: "🐉", name: "Ember",   title: "the Drake Kin" },
  { key: "witch",    emoji: "🧛", name: "Nyx",     title: "the Night Walker" },
];

export const TEMPLATE_BY_KEY: Record<string, CharacterTemplate> =
  Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));

// ---- persistence ----

const EQUIP_EVT = "dwa:equipped-changed";
const TEMPLATE_EVT = "dwa:template-changed";

const equipKey = (profileId: string) => `dwa_equipped_${profileId}`;
const templateKey = (profileId: string) => `dwa_template_${profileId}`;

export function getEquipped(profileId: string): Partial<Record<Slot, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(equipKey(profileId)) || "{}");
  } catch {
    return {};
  }
}

export function setEquipped(profileId: string, slot: Slot, itemKey: string | null) {
  if (typeof window === "undefined") return;
  const cur = getEquipped(profileId);
  if (itemKey) cur[slot] = itemKey;
  else delete cur[slot];
  localStorage.setItem(equipKey(profileId), JSON.stringify(cur));
  window.dispatchEvent(new CustomEvent(EQUIP_EVT, { detail: { profileId } }));
}

export function onEquippedChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EQUIP_EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EQUIP_EVT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function getTemplate(profileId: string): string {
  if (typeof window === "undefined") return "bard";
  return localStorage.getItem(templateKey(profileId)) || "bard";
}

export function setTemplate(profileId: string, key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(templateKey(profileId), key);
  window.dispatchEvent(new CustomEvent(TEMPLATE_EVT, { detail: { profileId } }));
}

export function onTemplateChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(TEMPLATE_EVT, handler);
  return () => window.removeEventListener(TEMPLATE_EVT, handler);
}
