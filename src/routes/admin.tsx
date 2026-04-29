import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useWallet, shortAddr } from "@/web3/WalletProvider";

type Row = {
  wallet_address: string;
  gb_token_balance: number;
  referral_count: number;
  current_level: number;
  created_at: string;
  updated_at: string;
};

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin · Registered Wallets · Game Bowy" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminPage() {
  const { address, isAdmin, role, connect, isInstalled } = useWallet();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/registered-wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          wallets?: Row[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setRows(json.wallets ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isAdmin]);

  if (!address) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Admin Access</h1>
        <p className="text-muted-foreground">
          Connect your admin wallet to view registered wallets.
        </p>
        <div className="flex gap-3">
          {isInstalled("metamask") && (
            <button
              onClick={() => connect("metamask")}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold"
            >
              Connect MetaMask
            </button>
          )}
          {isInstalled("rabby") && (
            <button
              onClick={() => connect("rabby")}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold"
            >
              Connect Rabby
            </button>
          )}
        </div>
        <Link to="/" className="text-sm text-muted-foreground underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center justify-center gap-3">
        <h1 className="text-2xl font-bold">Forbidden</h1>
        <p className="text-muted-foreground">
          {shortAddr(address)} ({role}) is not an admin wallet.
        </p>
        <Link to="/" className="text-sm text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Registered Wallets</h1>
            <p className="text-sm text-muted-foreground">
              Admin: {shortAddr(address)} · {rows?.length ?? 0} wallets
            </p>
          </div>
          <Link to="/" className="text-sm text-primary underline">
            ← Home
          </Link>
        </header>

        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error && (
          <p className="text-destructive bg-destructive/10 p-3 rounded">
            {error}
          </p>
        )}

        {rows && rows.length === 0 && !loading && (
          <p className="text-muted-foreground">No registered wallets yet.</p>
        )}

        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Wallet</th>
                  <th className="text-right px-4 py-3">GB Token Balance</th>
                  <th className="text-right px-4 py-3">Referral Count</th>
                  <th className="text-right px-4 py-3">Current Level</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.wallet_address}
                    className="border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className="md:hidden">
                        {shortAddr(r.wallet_address)}
                      </span>
                      <span className="hidden md:inline">
                        {r.wallet_address}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(r.gb_token_balance).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.referral_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.current_level}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
