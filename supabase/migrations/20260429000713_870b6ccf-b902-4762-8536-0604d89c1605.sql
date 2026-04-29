-- Add unique referral_code to wallet_profiles + generator + backfill
ALTER TABLE public.wallet_profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_profiles_referral_code_key
  ON public.wallet_profiles (referral_code)
  WHERE referral_code IS NOT NULL;

-- Generate a unique 6-char uppercase alphanumeric code (no ambiguous 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_already boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.wallet_profiles WHERE referral_code = code)
      INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-assign a code on insert if none provided
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_profiles_assign_referral_code ON public.wallet_profiles;
CREATE TRIGGER wallet_profiles_assign_referral_code
  BEFORE INSERT ON public.wallet_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_referral_code();

-- Backfill existing rows
UPDATE public.wallet_profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;