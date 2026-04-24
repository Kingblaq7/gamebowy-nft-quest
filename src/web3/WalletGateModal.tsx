import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Wallet, X, AlertTriangle, ExternalLink } from "lucide-react";
import { useWallet, shortAddr, type WalletKind } from "./WalletProvider";
import { ABEY_CHAIN_ID_DEC, GAME_TREASURY_ADDRESS, REQUIRED_PAYMENT_ABEY } from "./abey";

type Props = {
  open: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
};

export function WalletGateModal({ open, onClose, onUnlocked }: Props) {
  const w = useWallet();
  const [step, setStep] = useState<"choose" | "network" | "balance" | "pay" | "done">("choose");
  const [localError, setLocalError] = useState<string | null>(null);

  // Advance steps based on wallet state
  useEffect(() => {
    if (!open) return;
    if (w.paid) {
      setStep("done");
      onUnlocked?.();
      return;
    }
    if (!w.address) {
      setStep("choose");
      return;
    }
    if (w.chainId !== ABEY_CHAIN_ID_DEC) {
      setStep("network");
      return;
    }
    const bal = parseFloat(w.balanceAbey ?? "0");
    if (bal < parseFloat(REQUIRED_PAYMENT_ABEY)) {
      setStep("balance");
      return;
    }
    setStep("pay");
  }, [open, w.paid, w.address, w.chainId, w.balanceAbey, onUnlocked]);

  if (!open) return null;

  const handleConnect = async (kind: WalletKind) => {
    setLocalError(null);
    const ok = await w.connect(kind);
    if (!ok) return;
    // After connect, ensure network
    const onNet = await w.ensureAbeyNetwork();
    if (onNet) await w.refreshBalance();
  };

  const handleSwitch = async () => {
    setLocalError(null);
    const ok = await w.ensureAbeyNetwork();
    if (ok) await w.refreshBalance();
  };

  const handlePay = async () => {
    setLocalError(null);
    const res = await w.payToPlay();
    if (res.ok) {
      setStep("done");
      onUnlocked?.();
    } else {
      setLocalError(res.reason);
    }
  };

  const errMsg = localError || w.error;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          <ShieldCheck className="h-3.5 w-3.5" /> Web3 Access Gate
        </div>
        <h2 className="mt-2 font-display text-2xl font-black">
          Unlock the <span className="text-gradient-cosmic">Bowy Galaxy</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time payment of{" "}
          <span className="font-bold text-foreground">{REQUIRED_PAYMENT_ABEY} ABEY</span> on Abey Mainnet unlocks all chapters forever for your wallet.
        </p>

        {/* Status strip */}
        {w.address && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/40 bg-background/40 px-3 py-2 text-xs">
            <span className="font-mono">{shortAddr(w.address)}</span>
            <div className="flex items-center gap-2">
              {w.balanceAbey !== null && (
                <span className="text-muted-foreground">{parseFloat(w.balanceAbey).toFixed(4)} ABEY</span>
              )}
              <button
                onClick={w.disconnect}
                className="rounded-full border border-border/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {errMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errMsg}</span>
          </div>
        )}

        <div className="mt-5">
          {step === "choose" && (
            <div className="grid gap-3">
              <WalletOption
                label="MetaMask"
                installed={w.isInstalled("metamask")}
                onClick={() => handleConnect("metamask")}
                installUrl="https://metamask.io/download/"
                disabled={w.connecting}
              />
              <WalletOption
                label="Rabby Wallet"
                installed={w.isInstalled("rabby")}
                onClick={() => handleConnect("rabby")}
                installUrl="https://rabby.io/"
                disabled={w.connecting}
              />
              {w.connecting && (
                <p className="text-center text-xs text-muted-foreground">
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Awaiting wallet…
                </p>
              )}
            </div>
          )}

          {step === "network" && (
            <button
              onClick={handleSwitch}
              className="w-full rounded-2xl bg-gradient-aurora px-4 py-3 text-sm font-bold text-background"
            >
              Switch to Abey Mainnet
            </button>
          )}

          {step === "balance" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You need at least <span className="font-bold text-foreground">{REQUIRED_PAYMENT_ABEY} ABEY</span> to unlock the game.
                Top up your wallet and refresh.
              </p>
              <button
                onClick={() => w.refreshBalance()}
                className="w-full rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-sm font-semibold"
              >
                Refresh balance
              </button>
            </div>
          )}

          {step === "pay" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/40 bg-background/40 p-3 text-xs">
                <Row label="Send" value={`${REQUIRED_PAYMENT_ABEY} ABEY`} />
                <Row label="To" value={shortAddr(GAME_TREASURY_ADDRESS)} mono />
                <Row label="Network" value="Abey Mainnet" />
              </div>
              <button
                onClick={handlePay}
                disabled={w.paying}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-aurora px-4 py-3 text-sm font-bold text-background disabled:opacity-60"
              >
                {w.paying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Confirming on-chain…
                  </>
                ) : (
                  <>Pay {REQUIRED_PAYMENT_ABEY} ABEY & Play</>
                )}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="rounded-2xl border border-aurora/40 bg-aurora/10 p-4 text-center text-sm">
              <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-aurora" />
              <div className="font-bold">Wallet unlocked</div>
              <p className="mt-1 text-xs text-muted-foreground">You can now enter the galaxy.</p>
              <button
                onClick={onClose}
                className="mt-3 inline-block rounded-full bg-gradient-aurora px-5 py-2 text-xs font-bold text-background"
              >
                Enter Game
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
          Payments are verified on-chain. Treasury:{" "}
          <a
            href={`https://explorer.abeychain.com/address/${GAME_TREASURY_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-mono underline-offset-2 hover:underline"
          >
            {shortAddr(GAME_TREASURY_ADDRESS)} <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </p>
      </div>
    </div>
  );
}

function WalletOption({
  label,
  installed,
  onClick,
  installUrl,
  disabled,
}: {
  label: string;
  installed: boolean;
  onClick: () => void;
  installUrl: string;
  disabled?: boolean;
}) {
  if (!installed) {
    return (
      <a
        href={installUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-sm hover:bg-background/60"
      >
        <span className="flex items-center gap-2">
          <Wallet className="h-4 w-4" /> {label}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Install <ExternalLink className="ml-0.5 inline h-2.5 w-2.5" />
        </span>
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-2xl border border-primary/40 bg-card/40 px-4 py-3 text-sm font-semibold transition-colors hover:bg-card/70 disabled:opacity-60"
    >
      <span className="flex items-center gap-2">
        <Wallet className="h-4 w-4" /> {label}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-aurora">Detected</span>
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : "font-semibold"}>{value}</span>
    </div>
  );
}
