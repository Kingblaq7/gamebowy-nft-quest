import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;

function normalizeWallet(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const w = v.trim().toLowerCase();
  return WALLET_RE.test(w) ? w : null;
}

/**
 * POST /api/award-game-tokens
 * Body: { walletAddress: string, amount: number, chapter?: number, level?: number }
 *
 * Credits gameplay-earned GB tokens to a wallet's balance and bumps the
 * `game_tokens` source counter. Server is the source of truth for totals.
 */
export const Route = createFileRoute("/api/award-game-tokens")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            walletAddress?: unknown;
            amount?: unknown;
          };
          const wallet = normalizeWallet(body.walletAddress);
          if (!wallet) {
            return Response.json({ error: "Invalid wallet address" }, { status: 400 });
          }
          const amount = typeof body.amount === "number" ? body.amount : 0;
          if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) {
            return Response.json({ error: "Invalid amount" }, { status: 400 });
          }

          // Ensure profile exists
          const { data: existing } = await supabaseAdmin
            .from("wallet_profiles")
            .select("gb_balance, game_tokens")
            .eq("wallet_address", wallet)
            .maybeSingle();

          if (!existing) {
            const { data: created, error } = await supabaseAdmin
              .from("wallet_profiles")
              .insert({
                wallet_address: wallet,
                gb_balance: amount,
                game_tokens: amount,
              })
              .select("*")
              .single();
            if (error) throw error;
            return Response.json({ ok: true, profile: created });
          }

          const newBalance = Number(existing.gb_balance) + amount;
          const newGame = Number(existing.game_tokens) + amount;

          const { data: updated, error: updErr } = await supabaseAdmin
            .from("wallet_profiles")
            .update({ gb_balance: newBalance, game_tokens: newGame })
            .eq("wallet_address", wallet)
            .select("*")
            .single();
          if (updErr) throw updErr;

          return Response.json({ ok: true, profile: updated });
        } catch (e) {
          console.error("[/api/award-game-tokens] failed", e);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
