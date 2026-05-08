
-- Drop public read policies on sensitive tables
DROP POLICY IF EXISTS "Anyone can read move purchases" ON public.move_purchases;
DROP POLICY IF EXISTS "Anyone can read move balances" ON public.user_move_balance;
DROP POLICY IF EXISTS "Anyone can read referrals" ON public.referrals;
DROP POLICY IF EXISTS "Anyone can read wallet profiles" ON public.wallet_profiles;

-- Remove wallet_profiles from realtime publication if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wallet_profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.wallet_profiles';
  END IF;
END $$;

-- Ensure RLS is enabled (was already, but keep explicit)
ALTER TABLE public.move_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_move_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_wallets ENABLE ROW LEVEL SECURITY;

-- Explicit deny-by-default policies (no anon/auth role can do anything;
-- service role bypasses RLS so server endpoints continue to work).
DO $$
BEGIN
  -- paid_wallets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='paid_wallets' AND policyname='Deny all to clients') THEN
    EXECUTE $p$CREATE POLICY "Deny all to clients" ON public.paid_wallets FOR SELECT TO anon, authenticated USING (false)$p$;
  END IF;
  -- registered_wallets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registered_wallets' AND policyname='Deny all to clients') THEN
    EXECUTE $p$CREATE POLICY "Deny all to clients" ON public.registered_wallets FOR SELECT TO anon, authenticated USING (false)$p$;
  END IF;
END $$;

-- SIWE nonces (server-only access)
CREATE TABLE IF NOT EXISTS public.wallet_nonces (
  nonce text PRIMARY KEY,
  wallet_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz
);
ALTER TABLE public.wallet_nonces ENABLE ROW LEVEL SECURITY;
-- No policies = no client access. Service role bypasses RLS.

CREATE INDEX IF NOT EXISTS wallet_nonces_wallet_idx ON public.wallet_nonces (wallet_address);
CREATE INDEX IF NOT EXISTS wallet_nonces_expires_idx ON public.wallet_nonces (expires_at);
