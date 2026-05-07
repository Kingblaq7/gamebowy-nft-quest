import { useMemo, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import { Loader2, Minus, Plus, ShieldCheck, Wallet, X, Zap } from "lucide-react";
import { useWallet } from "@/web3/WalletProvider";
import {
  ABEY_PER_MOVE,
  MAX_MOVES,
  MIN_MOVES,
  MOVES_CONTRACT_ABI,
  MOVES_CONTRACT_ADDRESS,
  MOVES_PER_PACKAGE_DEFAULT,
  isMovesContractConfigured,
  totalAbeyForMoves,
} from "@/web3/abeyMoves";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

type Status = "idle" | "awaitingWallet" | "confirming" | "verifying" | "success" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  onPurchased: (movesAdded: number) => void;
}

export function PremiumMovesModal({ open, onClose, onPurchased }: Props) {
  const wallet = useWallet();
  const [qty, setQty] = useState(MOVES_PER_PACKAGE_DEFAULT);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const totalAbey = useMemo(() => totalAbeyForMoves(qty), [qty]);
  const busy = status === "awaitingWallet" || status === "confirming" || status === "verifying";

  if (!open) return null;

  const inc = () => setQty((n) => Math.min(MAX_MOVES, n + 1));
  const dec = () => setQty((n) => Math.max(MIN_MOVES, n - 1));
  const setPreset = (n: number) => setQty(Math.min(MAX_MOVES, Math.max(MIN_MOVES, n)));

  const handleClose = () => {
    if (busy) return;
    setStatus("idle");
    setError(null);
    onClose();
  };

  const handleBuy = async () => {
    setError(null);
    if (!wallet.address) {
      setError("Connect your wallet first.");
      return;
    }
    if (!isMovesContractConfigured()) {
      setError("Buy-Moves contract is not configured yet. Please try again soon.");
      return;
    }
    const onAbey = await wallet.ensureAbeyNetwork();
    if (!onAbey) {
      setError("Please switch to Abey Mainnet.");
      return;
    }

    setStatus("awaitingWallet");
    try {
      const eth = (typeof window !== "undefined" ? window.ethereum : null) as
        | Eip1193
        | null;
      if (!eth) throw new Error("No wallet provider found");

      const provider = new BrowserProvider(eth as never);
      const signer = await provider.getSigner();
      const contract = new Contract(MOVES_CONTRACT_ADDRESS, MOVES_CONTRACT_ABI, signer);

      // Send 100% payment to the contract; it handles treasury/burn split.
      const tx = await contract.buyMoves(qty, {
        value: BigInt(totalAbey) * 10n ** 18n,
      });

      setStatus("confirming");
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        throw new Error("Transaction failed on-chain");
      }

      setStatus("verifying");
      const res = await fetch("/api/buy-moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet.address.toLowerCase(),
          transactionHash: tx.hash.toLowerCase(),
          quantity: qty,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        movesGranted?: number;
        error?: string;
      };
      if (!json.ok) throw new Error(json.error ?? "Verification failed");

      setStatus("success");
      onPurchased(json.movesGranted ?? qty);
      window.setTimeout(() => {
        setStatus("idle");
        onClose();
      }, 900);
    } catch (e) {
      const err = e as { code?: number | string; message?: string };
      const userRejected = err.code === 4001 || err.code === "ACTION_REJECTED";
      setError(userRejected ? "Transaction rejected" : err.message || "Purchase failed");
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 px-4 pb-4 pt-10 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#39FF14]/40 bg-black p-6 shadow-[0_0_40px_-5px_#39FF14] animate-in fade-in slide-in-from-bottom-6 duration-300"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(57,255,20,0.18), transparent 60%), #000",
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={busy}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 disabled:opacity-40"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#39FF14]">
          <Zap className="h-3.5 w-3.5" />
          Premium Moves
        </div>
        <h2 className="mt-2 font-display text-3xl font-black text-white">
          Buy more <span className="text-[#39FF14]">moves</span>
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Pay in $ABEY directly on-chain. 1 move = {ABEY_PER_MOVE} ABEY.
        </p>

        {/* Quantity selector */}
        <div className="mt-6 rounded-2xl border border-[#39FF14]/30 bg-black/60 p-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={dec}
              disabled={qty <= MIN_MOVES || busy}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#39FF14]/40 bg-black text-[#39FF14] transition hover:bg-[#39FF14]/10 disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center">
              <div className="font-display text-5xl font-black tabular-nums text-white">
                {qty}
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                moves
              </div>
            </div>
            <button
              type="button"
              onClick={inc}
              disabled={qty >= MAX_MOVES || busy}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#39FF14]/40 bg-black text-[#39FF14] transition hover:bg-[#39FF14]/10 disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Presets */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[5, 10, 25, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPreset(n)}
                disabled={busy}
                className={`rounded-full border px-2 py-1.5 text-xs font-bold transition ${
                  qty === n
                    ? "border-[#39FF14] bg-[#39FF14]/15 text-[#39FF14]"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Live total */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-xs uppercase tracking-widest text-white/60">Total</span>
          <span className="font-display text-2xl font-black text-[#39FF14]">
            {totalAbey} <span className="text-sm text-white/70">ABEY</span>
          </span>
        </div>

        {/* Notices */}
        <ul className="mt-4 space-y-1.5 text-[11px] text-white/60">
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#39FF14]" />
            Wallet confirmation required
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#39FF14]" />
            No automatic charges
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#39FF14]" />
            Transactions are secured on-chain
          </li>
        </ul>

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleBuy}
          disabled={busy || !wallet.address}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#39FF14] px-5 py-3.5 font-display text-sm font-black uppercase tracking-wider text-black shadow-[0_0_30px_-5px_#39FF14] transition hover:brightness-110 disabled:opacity-60"
        >
          {status === "idle" || status === "error" ? (
            <>
              <Wallet className="h-4 w-4" />
              Continue with Wallet
            </>
          ) : status === "awaitingWallet" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirm in your wallet…
            </>
          ) : status === "confirming" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for blockchain…
            </>
          ) : status === "verifying" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying purchase…
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Moves added!
            </>
          )}
        </button>

        <p className="mt-3 text-center text-[10px] text-white/40">
          You'll be asked to confirm the transaction in your wallet. Funds go directly
          to the smart contract.
        </p>
      </div>
    </div>
  );
}
