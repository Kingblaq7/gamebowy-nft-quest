import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/check-access
 * Body: { walletAddress: string }
 * Returns: { role: "admin" | "user" }
 *
 * Admin wallets are configured via the ADMIN_WALLETS env var (comma-separated).
 * This is the source of truth — never trust the frontend to grant admin access.
 */
export const Route = createFileRoute("/api/check-access")({
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

          if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
            return Response.json(
              { error: "Invalid wallet address" },
              { status: 400 },
            );
          }

          const raw = process.env.ADMIN_WALLETS || "";
          const admins = raw
            .split(",")
            .map((a) => a.trim().toLowerCase())
            .filter((a) => /^0x[a-f0-9]{40}$/.test(a));

          const role: "admin" | "user" = admins.includes(wallet) ? "admin" : "user";
          return Response.json({ role });
        } catch (e) {
          console.error("[check-access] failed", e);
          return Response.json({ role: "user" });
        }
      },
    },
  },
});
