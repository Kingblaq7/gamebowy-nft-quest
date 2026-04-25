import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;

/**
 * POST /api/referrals
 * Body: { walletAddress: string }
 * Returns: { count: number, rewards: number, referees: string[] }
 */
export const Route = createFileRoute("/api/referrals")({
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

          const { data: rows, error } = await supabaseAdmin
            .from("referrals")
            .select("referee_wallet, reward_amount, created_at")
            .eq("referrer_wallet", wallet)
            .order("created_at", { ascending: false });
          if (error) throw error;

          const list = rows ?? [];
          const rewards = list.reduce(
            (sum, r) => sum + Number(r.reward_amount ?? 0),
            0,
          );

          return Response.json({
            count: list.length,
            rewards,
            referees: list.map((r) => r.referee_wallet),
          });
        } catch (e) {
          console.error("[/api/referrals] failed", e);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
