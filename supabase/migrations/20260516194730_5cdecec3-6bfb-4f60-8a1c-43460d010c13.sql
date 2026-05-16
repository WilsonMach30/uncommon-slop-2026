CREATE TABLE public.user_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_start timestamptz NOT NULL DEFAULT now(),
  active_minutes integer NOT NULL DEFAULT 0,
  daily_progress_percentage integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_engagement_all" ON public.user_engagement
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_user_engagement_user_id ON public.user_engagement(user_id);