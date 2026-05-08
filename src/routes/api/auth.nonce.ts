import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { issueNonce } from "@/lib/siwe.server";

const Body = z.object({
  walletAddress: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{40}$/, "Invalid wallet address"),
});

export const Route = createFileRoute("/api/auth/nonce")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const parsed = Body.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid wallet address" }, { status: 400 });
        }
        try {
          const { nonce, message, issuedAt } = await issueNonce(parsed.data.walletAddress);
          return Response.json({ nonce, message, issuedAt });
        } catch (e) {
          console.error("[auth/nonce] failed", e);
          return Response.json({ error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
