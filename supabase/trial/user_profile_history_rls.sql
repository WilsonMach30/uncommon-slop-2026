-- Run in the TRIAL Supabase project (VITE_TRIAL_SUPABASE_URL), SQL Editor.
-- The app uses the anon key; without these policies inserts/updates are silently blocked.

ALTER TABLE public.user_profile_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can insert user_profile_history" ON public.user_profile_history;
DROP POLICY IF EXISTS "anon can update user_profile_history" ON public.user_profile_history;
DROP POLICY IF EXISTS "anon can select user_profile_history" ON public.user_profile_history;

CREATE POLICY "anon can insert user_profile_history"
  ON public.user_profile_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can update user_profile_history"
  ON public.user_profile_history
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon can select user_profile_history"
  ON public.user_profile_history
  FOR SELECT
  TO anon
  USING (true);
