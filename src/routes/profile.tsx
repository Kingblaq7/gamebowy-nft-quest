import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Wallet,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  Flame,
  Gift,
  Users,
  Sparkles,
  Crown,
  ArrowLeft,
} from "lucide-react";
import { useWallet, shortAddr } from "@/web3/WalletProvider";
import {
  useWalletProfile,
  isClaimedToday,
  previewNextReward,
} from "@/web3/useWalletProfile";
import { WalletGateModal } from "@/web3/WalletGateModal";
import { useGbBalance } from "@/game/useGbBalance";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile · Game Bowy" },
      {
        name: "description",
        content:
          "Your Game Bowy profile: wallet, daily streak rewards, and referral stats.",
      },
      { property: "og:title", content: "Profile · Game Bowy" },
      {
        property: "og:description",
        content:
          "Connect your wallet, claim daily streak rewards and invite friends.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const w = useWallet();
  const { profile, referrals, loading, claiming, error, refresh, claim } =
    useWalletProfile(w.address);
  const gb = useGbBalance();
  const [gateOpen, setGateOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const prevReferralsRef = useRef<number | null>(null);

  // Tick every minute for the countdown
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const referralCode = profile?.referral_code ?? "";
  const referralLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (!referralCode) return "";
    return `${window.location.origin}/?ref=${referralCode}`;
  }, [referralCode]);

  const claimedToday = isClaimedToday(profile);
  const nextReward = previewNextReward(profile);
  const countdown = useMemo(() => {
    if (!claimedToday) return "";
    const d = new Date();
    d.setUTCHours(24, 0, 0, 0);
    const ms = Math.max(0, d.getTime() - now);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }, [claimedToday, now]);

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleCopyAddress = async () => {
    if (!w.address) return;
    try {
      await navigator.clipboard.writeText(w.address);
      setAddrCopied(true);
      window.setTimeout(() => setAddrCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleClaim = async () => {
    setClaimMsg(null);
    const r = await claim();
    if (r.ok) {
      if (r.reward && r.reward > 0) gb.add(r.reward);
      setClaimMsg(`+${r.reward?.toFixed(3)} GB claimed 🎉`);
    } else {
      setClaimMsg(r.error ?? "Claim failed");
    }
  };

  // Credit the local balance when new referral rewards arrive from backend.
  useEffect(() => {
    const count = referrals?.count ?? null;
    if (count === null) return;
    if (prevReferralsRef.current === null) {
      prevReferralsRef.current = count;
      return;
    }
    if (count > prevReferralsRef.current) {
      const newRefs = count - prevReferralsRef.current;
      gb.add(newRefs * 10);
      prevReferralsRef.current = count;
    } else {
      prevReferralsRef.current = count;
    }
  }, [referrals?.count, gb]);

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-background text-foreground"
      style={{
        background:
          "radial-gradient(ellipse at top, oklch(0.18 0.12 280) 0%, oklch(0.08 0.04 270) 60%, oklch(0.05 0.02 260) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 sm:pt-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-card/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <h1 className="font-display text-xl font-black sm:text-2xl">
            <span className="text-gradient-cosmic">Profile</span>
          </h1>
          <Link
            to="/play"
            className="rounded-full bg-gradient-aurora px-4 py-1.5 text-xs font-bold text-background"
          >
            Play
          </Link>
        </div>

        {/* Wallet card */}
        <section className="rounded-3xl border border-border/40 bg-card/50 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            <Wallet className="h-3.5 w-3.5" /> Wallet
          </div>

          {w.address ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl bg-background/40 px-4 py-2 font-mono text-sm">
                  <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-aurora" aria-hidden />
                  {shortAddr(w.address)}
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-2 text-xs font-semibold transition-colors hover:bg-card/70"
                  title="Copy full address"
                >
                  {addrCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
                {w.isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stardust/20 px-3 py-1 text-xs font-bold text-stardust">
                    <Crown className="h-3 w-3" /> Admin · Access Granted
                  </span>
                ) : w.paid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-aurora/20 px-3 py-1 text-xs font-bold text-aurora">
                    <Sparkles className="h-3 w-3" /> Access Granted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
                    ❌ Not Paid Yet
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat
                  label="GB Balance"
                  value={gb.balance.toFixed(3)}
                />
                <Stat
                  label="Network"
                  value={w.chainId === 179 ? "Abey" : `#${w.chainId ?? "—"}`}
                />
                <Stat
                  label="ABEY"
                  value={
                    w.balanceAbey ? parseFloat(w.balanceAbey).toFixed(3) : "—"
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setGateOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-xs font-semibold transition-colors hover:bg-card/70"
                >
                  <RefreshCw className="h-3 w-3" /> Reconnect
                </button>
                <button
                  onClick={() => w.disconnect()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                >
                  <LogOut className="h-3 w-3" /> Disconnect
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Connect a wallet to claim daily rewards and earn GB tokens
                through referrals.
              </p>
              <button
                onClick={() => setGateOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-aurora px-5 py-2.5 text-sm font-bold text-background"
              >
                <Wallet className="h-4 w-4" /> Connect Wallet
              </button>
            </>
          )}
        </section>

        {/* Streak card */}
        {w.address && (
          <section className="mt-5 rounded-3xl border border-border/40 bg-card/50 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              <Flame className="h-3.5 w-3.5 text-stardust" /> Daily Streak
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-4xl font-black">
                  🔥 {profile?.streak ?? 0}
                  <span className="ml-2 align-baseline text-base font-medium text-muted-foreground">
                    day{(profile?.streak ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reward today:{" "}
                  <span className="font-bold text-foreground">
                    {nextReward.toFixed(3)} GB
                  </span>
                </p>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                Reward = 0.001 × streak
                <br />
                Resets at 00:00 UTC
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={claiming || claimedToday || loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-aurora px-4 py-3 text-sm font-bold text-background transition-opacity disabled:opacity-50"
            >
              <Gift className="h-4 w-4" />
              {claiming
                ? "Claiming…"
                : claimedToday
                ? `Next claim in ${countdown || "soon"}`
                : `Claim ${nextReward.toFixed(3)} GB`}
            </button>

            {claimMsg && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {claimMsg}
              </p>
            )}
          </section>
        )}

        {/* Referrals card */}
        {w.address && (
          <section className="mt-5 rounded-3xl border border-border/40 bg-card/50 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              <Users className="h-3.5 w-3.5" /> Referrals
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat
                label="Total referrals"
                value={referrals?.count ?? profile?.total_referrals ?? 0}
              />
              <Stat
                label="GB earned"
                value={(
                  referrals?.rewards ??
                  profile?.referral_rewards ??
                  0
                ).toFixed(2)}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Share your code. You earn{" "}
              <span className="font-bold text-foreground">10 GB</span> per new
              wallet, and friends get{" "}
              <span className="font-bold text-foreground">5 GB</span> as a
              welcome bonus.
            </p>

            {/* Referral code */}
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Your code
              </div>
              <div className="mt-1 flex items-stretch gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-border/40 bg-background/40 px-4 py-2 font-display text-xl font-black tracking-[0.25em]">
                  {referralCode || "—"}
                </div>
                <button
                  onClick={handleCopyCode}
                  disabled={!referralCode}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-border/60 bg-card/40 px-4 text-xs font-semibold transition-colors hover:bg-card/70 disabled:opacity-50"
                >
                  {codeCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Referral link */}
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Your link
              </div>
              <div className="mt-1 flex items-stretch gap-2">
                <input
                  readOnly
                  value={referralLink}
                  className="min-w-0 flex-1 truncate rounded-2xl border border-border/40 bg-background/40 px-3 py-2 font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopy}
                  disabled={!referralLink}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-aurora px-4 text-xs font-bold text-background disabled:opacity-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </>
                  )}
                </button>
              </div>
            </div>

            {profile?.referred_by && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Referred by{" "}
                <span className="font-mono">{shortAddr(profile.referred_by)}</span>
              </p>
            )}
          </section>
        )}

        {error && (
          <p className="mt-4 text-center text-xs text-destructive">{error}</p>
        )}

        {/* Refresh */}
        {w.address && (
          <div className="mt-6 text-center">
            <button
              onClick={() => refresh()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Refresh data
            </button>
          </div>
        )}
      </div>

      <WalletGateModal open={gateOpen} onClose={() => setGateOpen(false)} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/30 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums">
        {value}
      </div>
    </div>
  );
}
