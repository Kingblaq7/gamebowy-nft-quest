import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;
const CODE_RE = /^[A-HJ-NP-Z2-9]{4,10}$/; // referral code format
const REFERRER_REWARD = 10; // GB to inviter
const REFEREE_BONUS = 5; // GB welcome bonus to new user

function normalizeWallet(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const w = input.trim().toLowerCase();
  return WALLET_RE.test(w) ? w : null;
}

function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const c = input.trim().toUpperCase();
  return CODE_RE.test(c) ? c : null;
}

type ProfileRow = {
  wallet_address: string;
  gb_balance: number;
  streak: number;
  last_claim_date: string | null;
  referred_by: string | null;
  total_referrals: number;
  referral_rewards: number;
  referral_code: string | null;
};

async function ensureProfile(wallet: string): Promise<ProfileRow> {
  const { data: existing } = await supabaseAdmin
    .from("wallet_profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .maybeSingle();
  if (existing) return existing as unknown as ProfileRow;

  const { data: created, error } = await supabaseAdmin
    .from("wallet_profiles")
    .insert({ wallet_address: wallet })
    .select("*")
    .single();
  if (error) throw error;
  return created as unknown as ProfileRow;
}

/**
 * Resolve a `ref` value to the inviter's wallet address.
 * Accepts either a referral code (preferred) or a legacy wallet address.
 */
async function resolveReferrer(ref: unknown): Promise<string | null> {
  const code = normalizeCode(ref);
  if (code) {
    const { data } = await supabaseAdmin
      .from("wallet_profiles")
      .select("wallet_address")
      .eq("referral_code", code)
      .maybeSingle();
    return (data?.wallet_address as string | undefined) ?? null;
  }
  // Backward compat: allow raw wallet ref
  return normalizeWallet(ref);
}

/**
 * POST /api/profile
 * Body: { walletAddress: string, ref?: string }
 *   `ref` is a referral code (e.g. "GBX7K9") or, for backward compat, a wallet address.
 *
 * Idempotently creates/returns the wallet profile. If `ref` is valid and
 * this wallet has no existing referrer (and ref !== self), records the referral,
 * credits the inviter REFERRER_REWARD GB, and gives the new user REFEREE_BONUS GB.
 */
export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            walletAddress?: unknown;
            ref?: unknown;
          };
          const wallet = normalizeWallet(body.walletAddress);
          if (!wallet) {
            return Response.json({ error: "Invalid wallet address" }, { status: 400 });
          }

          let profile = await ensureProfile(wallet);
          const referrerWallet = await resolveReferrer(body.ref);

          // Apply referral if eligible (not self, no existing referrer)
          if (
            referrerWallet &&
            referrerWallet !== wallet &&
            !profile.referred_by
          ) {
            await ensureProfile(referrerWallet);

            const { error: refErr } = await supabaseAdmin
              .from("referrals")
              .insert({
                referee_wallet: wallet,
                referrer_wallet: referrerWallet,
                reward_amount: REFERRER_REWARD,
              });

            if (!refErr) {
              // Update referee: record referrer + welcome bonus
              await supabaseAdmin
                .from("wallet_profiles")
                .update({
                  referred_by: referrerWallet,
                  gb_balance: Number(profile.gb_balance) + REFEREE_BONUS,
                })
                .eq("wallet_address", wallet);

              // Credit referrer
              const { data: refProfile } = await supabaseAdmin
                .from("wallet_profiles")
                .select("gb_balance, total_referrals, referral_rewards")
                .eq("wallet_address", referrerWallet)
                .single();
              if (refProfile) {
                await supabaseAdmin
                  .from("wallet_profiles")
                  .update({
                    gb_balance:
                      Number(refProfile.gb_balance) + REFERRER_REWARD,
                    total_referrals: refProfile.total_referrals + 1,
                    referral_rewards:
                      Number(refProfile.referral_rewards) + REFERRER_REWARD,
                  })
                  .eq("wallet_address", referrerWallet);
              }

              profile = await ensureProfile(wallet);
            }
          }

          return Response.json({ profile });
        } catch (e) {
          console.error("[/api/profile] failed", e);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
