CREATE TABLE public.user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'daily',
  title text NOT NULL,
  location text,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_quests_all" ON public.user_quests FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_user_quests_profile ON public.user_quests(profile_id);

CREATE TABLE public.unlocked_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  slot text NOT NULL,
  item_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, slot, item_key)
);

ALTER TABLE public.unlocked_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unlocked_cosmetics_all" ON public.unlocked_cosmetics FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_cosmetics_profile ON public.unlocked_cosmetics(profile_id);