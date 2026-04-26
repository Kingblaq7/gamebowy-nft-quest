import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * POST /api/claim-streak
 * Body: { walletAddress: string }
 *
 * Streak rules (UTC):
 * - First ever claim: streak = 1.
 * - If last claim was yesterday: streak += 1.
 * - If last claim was today: rejected (already claimed).
 * - Otherwise: streak resets to 1.
 *
 * Reward = 0.001 * streak (GB tokens) credited to gb_balance.
 */
export const Route = createFileRoute("/api/claim-streak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            walletAddress?: unknown;
          };
          const wallet =
            typeof body.walletAddress === "string"
              ? body.walletAddress.trim().toLowerCase()
              : "";
          if (!WALLET_RE.test(wallet)) {
            return Response.json(
              { error: "Invalid wallet address" },
              { status: 400 },
            );
          }

          // Ensure profile exists
          const { data: existing } = await supabaseAdmin
            .from("wallet_profiles")
            .select("*")
            .eq("wallet_address", wallet)
            .maybeSingle();

          let profile = existing;
          if (!profile) {
            const { data: created, error } = await supabaseAdmin
              .from("wallet_profiles")
              .insert({ wallet_address: wallet })
              .select("*")
              .single();
            if (error) throw error;
            profile = created;
          }

          const today = todayUTC();
          const yesterday = yesterdayUTC();
          const last = profile.last_claim_date;

          if (last === today) {
            return Response.json(
              {
                error: "Already claimed today",
                profile,
                nextClaimAt: nextUtcMidnight(),
              },
              { status: 409 },
            );
          }

          let newStreak: number;
          if (last === yesterday) newStreak = (profile.streak ?? 0) + 1;
          else newStreak = 1;

          const reward = Number((0.001 * newStreak).toFixed(6));
          const newBalance = Number(profile.gb_balance) + reward;
          const newStreakTokens =
            Number((profile as { streak_tokens?: number }).streak_tokens ?? 0) + reward;

          const { data: updated, error: updErr } = await supabaseAdmin
            .from("wallet_profiles")
            .update({
              streak: newStreak,
              last_claim_date: today,
              gb_balance: newBalance,
              streak_tokens: newStreakTokens,
            })
            .eq("wallet_address", wallet)
            .select("*")
            .single();
          if (updErr) throw updErr;

          return Response.json({
            ok: true,
            reward,
            streak: newStreak,
            profile: updated,
            nextClaimAt: nextUtcMidnight(),
          });
        } catch (e) {
          console.error("[/api/claim-streak] failed", e);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});

function nextUtcMidnight(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}
