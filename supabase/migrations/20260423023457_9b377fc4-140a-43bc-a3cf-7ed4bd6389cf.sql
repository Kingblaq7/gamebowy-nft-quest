-- Anonymous player profiles (keyed by client-generated UUID stored in localStorage)
CREATE TABLE public.players (
  id UUID NOT NULL PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'Cosmic Wanderer',
  total_score BIGINT NOT NULL DEFAULT 0,
  gb_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Per-level progress: best score, stars, completion
CREATE TABLE public.level_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  chapter_num INTEGER NOT NULL CHECK (chapter_num >= 1 AND chapter_num <= 10),
  level_num INTEGER NOT NULL CHECK (level_num >= 1 AND level_num <= 4),
  best_score INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  completed BOOLEAN NOT NULL DEFAULT false,
  plays INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (player_id, chapter_num, level_num)
);

CREATE INDEX idx_level_progress_player ON public.level_progress(player_id);
CREATE INDEX idx_players_total_score ON public.players(total_score DESC);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;

-- Anonymous-friendly policies: any client can read leaderboard data, any client can
-- create/read/update their own row by knowing the UUID (no auth required).
-- Note: this is intentional for anonymous play. Hardening (auth + per-user RLS) comes later.
CREATE POLICY "Anyone can read players for leaderboard"
  ON public.players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert a player row"
  ON public.players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update player rows"
  ON public.players FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can read level progress"
  ON public.level_progress FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert level progress"
  ON public.level_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update level progress"
  ON public.level_progress FOR UPDATE
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER players_touch BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();