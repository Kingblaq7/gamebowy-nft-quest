DROP POLICY IF EXISTS "Anyone can read level progress" ON public.level_progress;
REVOKE SELECT ON public.level_progress FROM anon, authenticated;
GRANT ALL ON public.level_progress TO service_role;