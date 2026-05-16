import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type TrialImageRow = {
  id: number;
  image_url: string;
  storage_path: string | null;
  description: string;
  created_at: string;
};

function createTrialSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_TRIAL_SUPABASE_URL;
  const key = import.meta.env.VITE_TRIAL_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing VITE_TRIAL_SUPABASE_URL or VITE_TRIAL_SUPABASE_PUBLISHABLE_KEY in .env",
    );
  }

  return createClient(url, key);
}

let _trialSupabase: SupabaseClient | undefined;

export const trialSupabase = new Proxy({} as SupabaseClient, {
  get(_, prop, receiver) {
    if (!_trialSupabase) _trialSupabase = createTrialSupabaseClient();
    return Reflect.get(_trialSupabase, prop, receiver);
  },
});
