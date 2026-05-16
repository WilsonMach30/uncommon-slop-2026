import { trialSupabase } from "@/integrations/supabase/trial-client";
import { toast } from "sonner";

const HISTORY_ROW_KEY = "trial_user_profile_history_id";

function reportError(action: string, error: { message?: string; code?: string }) {
  console.error(`[user_profile_history] ${action} failed`, error);
  const hint =
    error.code === "42501"
      ? "Enable anon insert/update on user_profile_history in the trial Supabase project (see supabase/trial/user_profile_history_rls.sql)."
      : error.message;
  toast.error("Could not save profile history", { description: hint });
}

function clearStoredRowId() {
  localStorage.removeItem(HISTORY_ROW_KEY);
}

export const LANGUAGE_LABEL_BY_CODE: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  ja: "Japanese",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
};

export const PASSION_LABEL_BY_ID: Record<string, string> = {
  food: "Food & Cuisine",
  travel: "Travel & Landmarks",
  culture: "Culture & Folklore",
  daily: "Daily Life & Chores",
  history: "History & Legends",
};

function passionLabelsFromIds(ids: string[]): string {
  return ids
    .map((id) => PASSION_LABEL_BY_ID[id])
    .filter(Boolean)
    .join(", ");
}

function getStoredRowId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(HISTORY_ROW_KEY);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

function setStoredRowId(id: number) {
  localStorage.setItem(HISTORY_ROW_KEY, String(id));
}

function languageLabel(code: string): string {
  return LANGUAGE_LABEL_BY_CODE[code] ?? "Spanish";
}

async function upsertProfileHistory(
  fields: Partial<{
    target_language: string;
    passion: string;
    level: number;
    interests: string;
  }>,
) {
  const rowId = getStoredRowId();

  if (rowId != null) {
    const { data, error } = await trialSupabase
      .from("user_profile_history")
      .update(fields)
      .eq("id", rowId)
      .select("id");

    if (error) {
      reportError("update", error);
      if (error.code === "42501") clearStoredRowId();
      return;
    }

    if (!data?.length) {
      clearStoredRowId();
    } else {
      return;
    }
  }

  const target_language = fields.target_language ?? languageLabel("es");
  const passion = fields.passion ?? "";
  const level = fields.level ?? 1;

  const { data, error } = await trialSupabase
    .from("user_profile_history")
    .insert({
      target_language,
      passion,
      level,
      ...(fields.interests != null ? { interests: fields.interests } : {}),
    })
    .select("id")
    .single();

  if (error) {
    reportError("insert", error);
    return;
  }

  if (data?.id != null) setStoredRowId(data.id);
}

export async function saveTargetLanguage(languageCode: string) {
  await upsertProfileHistory({ target_language: languageLabel(languageCode) });
}

export async function savePassions(passionIds: string[]) {
  await upsertProfileHistory({ passion: passionLabelsFromIds(passionIds) });
}

export async function saveProfileHistoryLevel(level: number) {
  await upsertProfileHistory({ level });
}

export async function syncProfileHistoryOnboarding(
  languageCode: string,
  passionIds: string[],
  level = 1,
) {
  await upsertProfileHistory({
    target_language: languageLabel(languageCode),
    passion: passionLabelsFromIds(passionIds),
    interests: passionIds.join(", "),
    level,
  });
}
