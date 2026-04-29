import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;

/**
 * POST /api/register-wallet
 * Body: { walletAddress: string }
 *
 * Idempotent registration: creates a row in `registered_wallets` if one does
 * not exist, otherwise returns the existing row. RLS denies all public
 * access; only this server function (service role) can read/write the table.
 */
export const Route = createFileRoute("/api/register-wallet")({
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

          const { data: existing } = await supabaseAdmin
            .from("registered_wallets")
            .select("*")
            .eq("wallet_address", wallet)
            .maybeSingle();

          if (existing) {
            return Response.json({ wallet: existing, created: false });
          }

          const { data: created, error } = await supabaseAdmin
            .from("registered_wallets")
            .insert({ wallet_address: wallet })
            .select("*")
            .single();
          if (error) {
            // Handle race condition: another request inserted between our check & insert
            const { data: retry } = await supabaseAdmin
              .from("registered_wallets")
              .select("*")
              .eq("wallet_address", wallet)
              .maybeSingle();
            if (retry) return Response.json({ wallet: retry, created: false });
            console.error("[register-wallet] insert failed", error);
            return Response.json({ error: "Insert failed" }, { status: 500 });
          }

          return Response.json({ wallet: created, created: true });
        } catch (e) {
          console.error("[register-wallet] failed", e);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
