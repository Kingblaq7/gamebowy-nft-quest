create table if not exists public.paid_wallets (
  wallet_address text primary key,
  tx_hash text not null unique,
  amount_wei text not null,
  chain_id integer not null,
  paid_at timestamptz not null default now()
);

alter table public.paid_wallets enable row level security;

create policy "Anyone can read paid wallets"
  on public.paid_wallets for select
  to public
  using (true);
