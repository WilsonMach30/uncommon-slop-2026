
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  interests TEXT[] NOT NULL DEFAULT '{}',
  current_region INT NOT NULL DEFAULT 1,
  exploration_level INT NOT NULL DEFAULT 1,
  gold_tokens INT NOT NULL DEFAULT 0,
  map_energy INT NOT NULL DEFAULT 100,
  proficiency_score INT NOT NULL DEFAULT 0,
  streak_days INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.engagement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  location_name TEXT,
  track TEXT,
  session_input TEXT,
  duration_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies (no auth in MVP; device_id scoping happens client-side)
CREATE POLICY "profiles_all" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "engagement_all" ON public.engagement_logs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_engagement_profile ON public.engagement_logs(profile_id);
