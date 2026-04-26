import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WalletProfile = {
  wallet_address: string;
  gb_balance: number;
  streak: number;
  last_claim_date: string | null;
  referred_by: string | null;
  total_referrals: number;
  referral_rewards: number;
  game_tokens: number;
  referral_tokens: number;
  streak_tokens: number;
};

export type ReferralStats = {
  count: number;
  rewards: number;
  referees: string[];
};

/** True when last_claim_date (UTC) equals today (UTC). */
export function isClaimedToday(profile: WalletProfile | null): boolean {
  if (!profile?.last_claim_date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return profile.last_claim_date === today;
}

/** Reward shown for next claim button (estimate; backend is authoritative). */
export function previewNextReward(profile: WalletProfile | null): number {
  if (!profile) return 0.001;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let nextStreak: number;
  if (profile.last_claim_date === today) nextStreak = profile.streak;
  else if (profile.last_claim_date === yesterday) nextStreak = profile.streak + 1;
  else nextStreak = 1;
  return Number((0.001 * nextStreak).toFixed(6));
}

export function useWalletProfile(walletAddress: string | null) {
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [referrals, setReferrals] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!walletAddress) {
      setProfile(null);
      setReferrals(null);
      return;
    }
    const wallet = walletAddress.toLowerCase();
    setLoading(true);
    setError(null);
    try {
      // Read profile directly from DB (public SELECT policy).
      const { data: prof } = await supabase
        .from("wallet_profiles")
        .select("*")
        .eq("wallet_address", wallet)
        .maybeSingle();
      if (prof) setProfile(prof as unknown as WalletProfile);
      else {
        // Backfill via API (also handles referral param)
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: wallet }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          profile?: WalletProfile;
        };
        if (json.profile) setProfile(json.profile);
      }

      const refRes = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet }),
      });
      const refJson = (await refRes.json().catch(() => ({}))) as ReferralStats;
      if (refJson && typeof refJson.count === "number") setReferrals(refJson);
    } catch (e) {
      console.warn("[useWalletProfile] fetch failed", e);
      setError("Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const claim = useCallback(async (): Promise<{
    ok: boolean;
    reward?: number;
    error?: string;
  }> => {
    if (!walletAddress) return { ok: false, error: "No wallet" };
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/claim-streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletAddress.toLowerCase() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reward?: number;
        profile?: WalletProfile;
        error?: string;
      };
      if (json.profile) setProfile(json.profile);
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Claim failed");
        return { ok: false, error: json.error ?? "Claim failed" };
      }
      return { ok: true, reward: json.reward };
    } catch (e) {
      const msg = (e as Error).message ?? "Claim failed";
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setClaiming(false);
    }
  }, [walletAddress]);

  return {
    profile,
    referrals,
    loading,
    claiming,
    error,
    refresh: fetchAll,
    claim,
  };
}
