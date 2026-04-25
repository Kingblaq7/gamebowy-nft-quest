
-- Wallet profiles (off-chain account state for a connected wallet)
CREATE TABLE public.wallet_profiles (
  wallet_address text PRIMARY KEY,
  gb_balance numeric NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  last_claim_date date,
  referred_by text,
  total_referrals integer NOT NULL DEFAULT 0,
  referral_rewards numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wallet profiles"
  ON public.wallet_profiles FOR SELECT
  USING (true);

CREATE TRIGGER wallet_profiles_touch
  BEFORE UPDATE ON public.wallet_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Referrals log (referee -> referrer)
CREATE TABLE public.referrals (
  referee_wallet text PRIMARY KEY,
  referrer_wallet text NOT NULL,
  reward_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX referrals_referrer_idx ON public.referrals (referrer_wallet);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read referrals"
  ON public.referrals FOR SELECT
  USING (true);
