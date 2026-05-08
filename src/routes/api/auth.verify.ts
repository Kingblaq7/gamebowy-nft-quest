import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { setCookie } from "@tanstack/react-start/server";
import {
  SESSION_COOKIE,
  buildSessionCookie,
  verifySignature,
} from "@/lib/siwe.server";

const Body = z.object({
  walletAddress: z.string().trim().toLowerCase().regex(/^0x[a-f0-9]{40}$/),
  nonce: z.string().min(8).max(128),
  issuedAt: z.string().min(10).max(64),
  signature: z.string().min(10).max(256),
});

export const Route = createFileRoute("/api/auth/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const parsed = Body.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid input" }, { status: 400 });
        }
        const result = await verifySignature(parsed.data);
        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 401 });
        }
        const cookie = buildSessionCookie(result.wallet);
        setCookie(SESSION_COOKIE, cookie.value, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: cookie.maxAgeSeconds,
        });
        return Response.json({ ok: true, wallet: result.wallet });
      },
    },
  },
});
