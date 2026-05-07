
-- Move purchase tracking (paid in $ABEY)
CREATE TABLE IF NOT EXISTS public.move_purchases (
  tx_hash text PRIMARY KEY,
  wallet_address text NOT NULL,
  moves_purchased integer NOT NULL CHECK (moves_purchased > 0),
  amount_wei text NOT NULL,
  chain_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_move_purchases_wallet
  ON public.move_purchases (wallet_address);

ALTER TABLE public.move_purchases ENABLE ROW LEVEL SECURITY;

-- Public can read their own purchase history (wallet address is public identifier).
CREATE POLICY "Anyone can read move purchases"
  ON public.move_purchases FOR SELECT
  USING (true);

-- No public writes (server-only via service role).

-- Per-wallet purchased move balance (server-authoritative).
CREATE TABLE IF NOT EXISTS public.user_move_balance (
  wallet_address text PRIMARY KEY,
  moves_balance integer NOT NULL DEFAULT 0 CHECK (moves_balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_move_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read move balances"
  ON public.user_move_balance FOR SELECT
  USING (true);

CREATE TRIGGER trg_user_move_balance_touch
  BEFORE UPDATE ON public.user_move_balance
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
