-- Lock down paid_wallets: remove public read, only service role can read
DROP POLICY IF EXISTS "Anyone can read paid wallets" ON public.paid_wallets;

-- Lock down players: remove open INSERT/UPDATE; keep public SELECT for leaderboard
DROP POLICY IF EXISTS "Anyone can insert a player row" ON public.players;
DROP POLICY IF EXISTS "Anyone can update player rows" ON public.players;

-- Lock down level_progress: remove open INSERT/UPDATE; keep public SELECT
DROP POLICY IF EXISTS "Anyone can insert level progress" ON public.level_progress;
DROP POLICY IF EXISTS "Anyone can update level progress" ON public.level_progress;