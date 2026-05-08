import { createFileRoute } from "@tanstack/react-router";
import { readSessionWallet } from "@/lib/siwe.server";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async () => {
        const wallet = readSessionWallet();
        return Response.json({ wallet });
      },
    },
  },
});
