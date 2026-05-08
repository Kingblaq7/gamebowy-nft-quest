import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { HttpError, requireSessionWallet } from "@/lib/siwe.server";

const WALLET_RE = /^0x[a-f0-9]{40}$/;

/** GET /api/wallet/moves?walletAddress=0x... — owner-only move balance. */
export const Route = createFileRoute("/api/wallet/moves")({
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
          .from("user_move_balance")
          .select("moves_balance")
          .eq("wallet_address", wallet)
          .maybeSingle();
        return Response.json({ balance: Number(data?.moves_balance ?? 0) });
      },
    },
  },
});
