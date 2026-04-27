import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BuyMovesSchema = z.object({
  walletAddress: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{40}$/, "Invalid wallet address"),
});

const COST_GB = 10;
const MOVES_GRANTED = 30;

export const Route = createFileRoute("/api/buy-moves")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = BuyMovesSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 }
          );
        }
        const wallet = parsed.data.walletAddress;

        try {
          // Read profile balance (server-authoritative)
          const { data: profile, error: readErr } = await supabaseAdmin
            .from("wallet_profiles")
            .select("wallet_address, gb_balance")
            .eq("wallet_address", wallet)
            .maybeSingle();

          if (readErr) {
            console.error("[buy-moves] read error", readErr);
            return Response.json({ ok: false, error: "Profile lookup failed" }, { status: 500 });
          }

          const balance = Number(profile?.gb_balance ?? 0);
          if (balance < COST_GB) {
            return Response.json(
              { ok: false, error: "Not enough GB tokens", balance },
              { status: 200 }
            );
          }

          const newBalance = balance - COST_GB;
          const { error: updErr } = await supabaseAdmin
            .from("wallet_profiles")
            .update({ gb_balance: newBalance, updated_at: new Date().toISOString() })
            .eq("wallet_address", wallet);

          if (updErr) {
            console.error("[buy-moves] update error", updErr);
            return Response.json({ ok: false, error: "Could not deduct tokens" }, { status: 500 });
          }

          return Response.json({
            ok: true,
            movesGranted: MOVES_GRANTED,
            cost: COST_GB,
            balance: newBalance,
          });
        } catch (e) {
          console.error("[buy-moves] unexpected", e);
          return Response.json({ ok: false, error: "Unexpected error" }, { status: 500 });
        }
      },
    },
  },
});
