import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "dwa_device_id";
const PROFILE_KEY = "dwa_profile_id";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getStoredProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_KEY);
}

export function setStoredProfileId(id: string) {
  localStorage.setItem(PROFILE_KEY, id);
}

export async function loadProfile() {
  const deviceId = getDeviceId();
  if (!deviceId) return null;
  const { data } = await supabase.from("profiles").select("*").eq("device_id", deviceId).maybeSingle();
  if (data) setStoredProfileId(data.id);
  return data;
}

export async function createProfile(language: string, interests: string[]) {
  const deviceId = getDeviceId();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ device_id: deviceId, language, interests })
    .select()
    .single();
  if (error) throw error;
  setStoredProfileId(data.id);
  return data;
}

export async function logEngagement(
  profileId: string,
  payload: { event_type: string; location_name?: string; track?: string; session_input?: string; duration_seconds?: number },
) {
  await supabase.from("engagement_logs").insert({ profile_id: profileId, ...payload });
}

export const QUEST_VICTORY_XP = 50;
export const QUEST_VICTORY_GOLD = 20;

/** Awards loot for completing all steps in a quest conversation round. */
export async function awardQuestRoundVictory(profileId: string) {
  const { data: current, error: fetchError } = await supabase
    .from("profiles")
    .select("gold_tokens, proficiency_score")
    .eq("id", profileId)
    .single();
  if (fetchError) throw fetchError;

  const gold_tokens = (current?.gold_tokens ?? 0) + QUEST_VICTORY_GOLD;
  const proficiency_score = (current?.proficiency_score ?? 0) + QUEST_VICTORY_XP;

  const { data, error } = await supabase
    .from("profiles")
    .update({ gold_tokens, proficiency_score })
    .eq("id", profileId)
    .select("gold_tokens, proficiency_score")
    .single();
  if (error) throw error;

  await logEngagement(profileId, { event_type: "quest_victory", duration_seconds: 0 });
  return data;
}
