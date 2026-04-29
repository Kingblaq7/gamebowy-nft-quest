-- Create RegisteredWallets table for the new registration tracking system
CREATE TABLE public.registered_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  gb_token_balance NUMERIC NOT NULL DEFAULT 0,
  referral_count INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce wallet format
ALTER TABLE public.registered_wallets
  ADD CONSTRAINT registered_wallets_address_format
  CHECK (wallet_address ~ '^0x[a-f0-9]{40}$');

CREATE INDEX idx_registered_wallets_created_at ON public.registered_wallets (created_at DESC);

-- Enable RLS
ALTER TABLE public.registered_wallets ENABLE ROW LEVEL SECURITY;

-- DENY ALL public access. All reads/writes go through server functions
-- using the service-role admin client. Admin listing is gated by
-- ADMIN_WALLETS env var on the server, never by RLS (no auth.uid here).
-- (No policies created => default deny for anon/authenticated roles.)

-- Auto-update updated_at on writes (reuse existing helper)
CREATE TRIGGER registered_wallets_touch_updated_at
  BEFORE UPDATE ON public.registered_wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();