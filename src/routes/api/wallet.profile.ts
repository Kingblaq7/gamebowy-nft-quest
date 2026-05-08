import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { HttpError, requireSessionWallet } from "@/lib/siwe.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;

/**
 * GET /api/wallet/profile?walletAddress=0x...
 * Returns the wallet_profile row for the authenticated wallet only.
 */
export const Route = createFileRoute("/api/wallet/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const wallet = (url.searchParams.get("walletAddress") || "")
          .trim()
          .toLowerCase();
        if (!WALLET_RE.test(wallet)) {
          return Response.json({ error: "Invalid wallet" }, { status: 400 });
        }
        try {
          requireSessionWallet(wallet);
        } catch (e) {
          if (e instanceof HttpError)
            return Response.json({ error: e.message }, { status: e.status });
          throw e;
        }
        const { data } = await supabaseAdmin
          .from("wallet_profiles")
          .select("*")
          .eq("wallet_address", wallet)
          .maybeSingle();
        return Response.json({ profile: data ?? null });
      },
    },
  },
});
