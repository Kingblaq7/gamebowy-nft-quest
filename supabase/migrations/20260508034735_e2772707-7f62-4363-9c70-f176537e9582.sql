
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = false) AS
SELECT id, display_name, total_score, created_at, updated_at
FROM public.players;
GRANT SELECT ON public.leaderboard TO anon, authenticated;
