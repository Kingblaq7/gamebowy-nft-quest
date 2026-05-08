
-- Explicit deny-all SELECT/INSERT/UPDATE/DELETE policies for clients on sensitive tables.
-- Service role bypasses RLS so server functions/routes continue to work.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['move_purchases','user_move_balance','referrals','wallet_profiles','wallet_nonces']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Deny all SELECT to clients" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Deny all INSERT to clients" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Deny all UPDATE to clients" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Deny all DELETE to clients" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Deny all SELECT to clients" ON public.%I FOR SELECT TO anon, authenticated USING (false)', t);
    EXECUTE format('CREATE POLICY "Deny all INSERT to clients" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (false)', t);
    EXECUTE format('CREATE POLICY "Deny all UPDATE to clients" ON public.%I FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)', t);
    EXECUTE format('CREATE POLICY "Deny all DELETE to clients" ON public.%I FOR DELETE TO anon, authenticated USING (false)', t);
  END LOOP;
END $$;

-- Remove gb_tokens exposure on the public leaderboard table.
-- Drop the public SELECT policy and provide a column-restricted view for leaderboard reads.
DROP POLICY IF EXISTS "Anyone can read players for leaderboard" ON public.players;

CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT id, display_name, total_score, created_at, updated_at
FROM public.players;

GRANT SELECT ON public.leaderboard TO anon, authenticated;

-- Allow public read on the view by adding a SELECT policy on players
-- limited to nothing client-side; leaderboard data will be served server-side.
-- Keep an explicit deny for clarity:
CREATE POLICY "Deny all SELECT on players to clients"
  ON public.players FOR SELECT TO anon, authenticated USING (false);
