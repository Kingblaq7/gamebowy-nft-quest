import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;
const REFERRAL_REWARD = 10; // GB tokens credited to referrer per new referee

function normalizeWallet(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const w = input.trim().toLowerCase();
  return WALLET_RE.test(w) ? w : null;
}

type ProfileRow = {
  wallet_address: string;
  gb_balance: number;
  streak: number;
  last_claim_date: string | null;
  referred_by: string | null;
  total_referrals: number;
  referral_rewards: number;
};

async function ensureProfile(wallet: string): Promise<ProfileRow> {
  const { data: existing } = await supabaseAdmin
    .from("wallet_profiles")
    .select("*")
    .eq("wallet_address", wallet)
    .maybeSingle();
  if (existing) return existing as ProfileRow;

  const { data: created, error } = await supabaseAdmin
    .from("wallet_profiles")
    .insert({ wallet_address: wallet })
    .select("*")
    .single();
  if (error) throw error;
  return created as ProfileRow;
}

/**
 * POST /api/profile
 * Body: { walletAddress: string, ref?: string }
 *
 * Idempotently creates/returns the wallet profile. If `ref` is provided and
 * this wallet has no existing referrer (and ref !== walletAddress), records
 * the referral and credits the referrer with REFERRAL_REWARD GB tokens.
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
          const ref = normalizeWallet(body.ref);

          // Apply referral if eligible
          if (ref && ref !== wallet && !profile.referred_by) {
            // Make sure referrer profile exists
            await ensureProfile(ref);

            // Insert referral row (PRIMARY KEY on referee prevents duplicates)
            const { error: refErr } = await supabaseAdmin
              .from("referrals")
              .insert({
                referee_wallet: wallet,
                referrer_wallet: ref,
                reward_amount: REFERRAL_REWARD,
              });

            if (!refErr) {
              // Update referee
              await supabaseAdmin
                .from("wallet_profiles")
                .update({ referred_by: ref })
                .eq("wallet_address", wallet);

              // Credit referrer
              const { data: refProfile } = await supabaseAdmin
                .from("wallet_profiles")
                .select("gb_balance, total_referrals, referral_rewards, referral_tokens")
                .eq("wallet_address", ref)
                .single();
              if (refProfile) {
                await supabaseAdmin
                  .from("wallet_profiles")
                  .update({
                    gb_balance: Number(refProfile.gb_balance) + REFERRAL_REWARD,
                    total_referrals: refProfile.total_referrals + 1,
                    referral_rewards:
                      Number(refProfile.referral_rewards) + REFERRAL_REWARD,
                    referral_tokens:
                      Number(refProfile.referral_tokens ?? 0) + REFERRAL_REWARD,
                  })
                  .eq("wallet_address", ref);
              }

              // Re-fetch to return fresh state
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
