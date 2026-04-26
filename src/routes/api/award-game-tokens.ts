import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/award-game-tokens")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            wallet_address?: string;
            amount?: number;
          };
          const wallet = body.wallet_address?.toLowerCase();
          const amount = Number(body.amount ?? 0);

          if (!wallet || !/^0x[a-f0-9]{40}$/.test(wallet)) {
            return Response.json({ error: "Invalid wallet" }, { status: 400 });
          }
          if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
            return Response.json({ error: "Invalid amount" }, { status: 400 });
          }

          const supabase = createSupabaseServer();

          const { data: existing } = await supabase
            .from("wallet_profiles")
            .select("game_tokens, gb_balance")
            .eq("wallet_address", wallet)
            .maybeSingle();

          const newGame = (existing?.game_tokens ?? 0) + amount;
          const newBalance = (existing?.gb_balance ?? 0) + amount;

          const { error } = await supabase
            .from("wallet_profiles")
            .upsert(
              {
                wallet_address: wallet,
                game_tokens: newGame,
                gb_balance: newBalance,
              },
              { onConflict: "wallet_address" },
            );

          if (error) {
            return Response.json({ error: error.message }, { status: 500 });
          }

          return Response.json({
            success: true,
            game_tokens: newGame,
            gb_balance: newBalance,
          });
        } catch (e) {
          return Response.json(
            { error: e instanceof Error ? e.message : "Unknown error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
