-- Run in the TRIAL Supabase project if image_url / description columns are missing.

ALTER TABLE public.user_profile_history
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;
