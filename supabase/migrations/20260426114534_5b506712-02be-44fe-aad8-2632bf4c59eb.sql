-- 1. Levels config table (controls move counts per level)
CREATE TABLE IF NOT EXISTS public.levels (
  chapter_num integer NOT NULL,
  level_num integer NOT NULL,
  base_moves integer NOT NULL DEFAULT 32,
  combo_bonus integer NOT NULL DEFAULT 2,
  score_target integer NOT NULL DEFAULT 1500,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chapter_num, level_num)
);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read levels"
ON public.levels FOR SELECT
USING (true);

-- Seed: Level N moves = max(20, 32 - 2*(N-1)) per chapter (10 chapters x 4 levels)
INSERT INTO public.levels (chapter_num, level_num, base_moves, combo_bonus, score_target)
SELECT
  c.chapter_num,
  l.level_num,
  GREATEST(20, 32 - 2 * (l.level_num - 1) - (c.chapter_num - 1)) AS base_moves,
  2 AS combo_bonus,
  1500 + (c.chapter_num - 1) * 1000 + (l.level_num - 1) * 500 AS score_target
FROM generate_series(1, 10) AS c(chapter_num)
CROSS JOIN generate_series(1, 4) AS l(level_num)
ON CONFLICT (chapter_num, level_num) DO NOTHING;

-- 2. Add token-source breakdown to wallet_profiles
ALTER TABLE public.wallet_profiles
  ADD COLUMN IF NOT EXISTS game_tokens numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_tokens numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_tokens numeric NOT NULL DEFAULT 0;

-- Backfill: assume any pre-existing balance came from streaks (the only flow that existed)
UPDATE public.wallet_profiles
SET streak_tokens = gb_balance
WHERE streak_tokens = 0 AND gb_balance > 0;