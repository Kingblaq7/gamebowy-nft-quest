import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  walletAddress: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{40}$/, "Invalid wallet address"),
  amount: z.number().positive().max(1000),
  reason: z.enum(["gameplay", "referral", "streak", "bonus"]).default("gameplay"),
});

/**
 * POST /api/award-tokens
 * Server-authoritative GB credit. Ensures wallet_profiles row exists,
 * then increments gb_balance and returns the new balance.
 */
export const Route = createFileRoute("/api/award-tokens")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 },
          );
        }
        const { walletAddress: wallet, amount } = parsed.data;

        try {
          // Ensure profile exists
          const { data: existing } = await supabaseAdmin
            .from("wallet_profiles")
            .select("gb_balance")
            .eq("wallet_address", wallet)
            .maybeSingle();

          let current = Number(existing?.gb_balance ?? 0);
          if (!existing) {
            const { data: created, error: insErr } = await supabaseAdmin
              .from("wallet_profiles")
              .insert({ wallet_address: wallet })
              .select("gb_balance")
              .single();
            if (insErr) throw insErr;
            current = Number(created?.gb_balance ?? 0);
          }

          const newBalance = Number((current + amount).toFixed(6));
          const { data: updated, error: updErr } = await supabaseAdmin
            .from("wallet_profiles")
            .update({ gb_balance: newBalance, updated_at: new Date().toISOString() })
            .eq("wallet_address", wallet)
            .select("gb_balance")
            .single();
          if (updErr) throw updErr;

          return Response.json({
            ok: true,
            balance: Number(updated.gb_balance),
            credited: amount,
          });
        } catch (e) {
          console.error("[award-tokens] failed", e);
          return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
