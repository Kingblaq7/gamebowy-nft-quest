import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;

function isAdminWallet(wallet: string): boolean {
  const raw = process.env.ADMIN_WALLETS || "";
  const admins = raw
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => WALLET_RE.test(a));
  return admins.includes(wallet);
}

/**
 * POST /api/admin/registered-wallets
 * Body: { walletAddress: string }   // the *caller's* wallet (must be admin)
 *
 * Returns the full list of registered wallets. Gated by ADMIN_WALLETS env var.
 * Never expose this without the admin check — RLS denies direct table access,
 * so this endpoint is the only window into the data.
 */
export const Route = createFileRoute("/api/admin/registered-wallets")({
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
          if (!WALLET_RE.test(wallet) || !isAdminWallet(wallet)) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
          }

          const { data, error } = await supabaseAdmin
            .from("registered_wallets")
            .select(
              "wallet_address, gb_token_balance, referral_count, current_level, created_at, updated_at",
            )
            .order("created_at", { ascending: false })
            .limit(1000);
          if (error) {
            console.error("[admin/registered-wallets] query failed", error);
            return Response.json({ error: "Query failed" }, { status: 500 });
          }

          return Response.json({ wallets: data ?? [] });
        } catch (e) {
          console.error("[admin/registered-wallets] failed", e);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
