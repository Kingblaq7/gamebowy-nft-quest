import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { WalletGateModal } from "./WalletGateModal";

/**
 * Renders children only when the connected wallet has paid.
 * Otherwise, opens the wallet gate modal and shows a locked screen.
 */
export function RequirePaidWallet({ children }: { children: React.ReactNode }) {
  const w = useWallet();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (w.address) {
        await Promise.all([w.checkPaidStatus(), w.checkRole()]);
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.address]);

  useEffect(() => {
    if (!checking && !w.hasAccess) setOpen(true);
  }, [checking, w.hasAccess]);

  if (w.hasAccess) return <>{children}</>;

  return (
    <>
      <main className="relative flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-stardust" />
          <h1 className="mt-3 font-display text-2xl font-black">Wallet required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect a wallet and pay 2 ABEY to unlock all chapters of Game Bowy.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-full bg-gradient-aurora px-5 py-2 text-sm font-bold text-background"
            >
              Open wallet gate
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="rounded-full border border-border/60 px-5 py-2 text-sm font-semibold"
            >
              Home
            </button>
          </div>
        </div>
      </main>
      <WalletGateModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
