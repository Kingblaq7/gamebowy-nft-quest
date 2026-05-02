import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from "@/web3/WalletProvider";

/**
 * GB balance hook — Supabase is the source of truth.
 *
 * Behavior:
 * - On mount / wallet change: fetch authoritative balance from Supabase and
 *   override any cached value.
 * - localStorage is used purely as a per-wallet read-through cache so the UI
 *   shows a number instantly on cold load before the network round-trip.
 * - `add(n)` writes to Supabase first via /api/award-tokens, then updates
 *   local state and cache with the server-returned balance.
 * - `spend(n)` is best-effort optimistic for callers that have already
 *   debited server-side (e.g. /api/buy-moves returns the new balance — use
 *   `setFromServer(balance)` instead). Returns false if cached balance is
 *   insufficient. Real authorization happens on the server.
 *
 * If no wallet is connected, the hook falls back to a local-only mode so the
 * game UI still works for guests.
 */

const EVENT = "gb_balance_changed";
const GUEST_KEY = "gb_balance_local";
const DEFAULT_GUEST_BALANCE = 50;

function cacheKey(wallet: string | null): string {
  return wallet ? `gb_balance:${wallet.toLowerCase()}` : GUEST_KEY;
}

function readCache(wallet: string | null): number {
  if (typeof window === "undefined") return 0;
  const key = cacheKey(wallet);
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    if (!wallet) {
      window.localStorage.setItem(key, String(DEFAULT_GUEST_BALANCE));
      return DEFAULT_GUEST_BALANCE;
    }
    return 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function writeCache(wallet: string | null, n: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cacheKey(wallet), String(n));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useGbBalance() {
  const wallet = useWallet();
  const address = wallet.address ? wallet.address.toLowerCase() : null;
  const addressRef = useRef(address);
  addressRef.current = address;

  const [balance, setBalance] = useState<number>(() => readCache(address));

  // Cross-tab / cross-component cache sync
  useEffect(() => {
    const sync = () => setBalance(readCache(addressRef.current));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // On wallet change, immediately reflect cached value, then fetch authoritative.
  useEffect(() => {
    setBalance(readCache(address));
    if (!address) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("wallet_profiles")
          .select("gb_balance")
          .eq("wallet_address", address)
          .maybeSingle();
        if (cancelled) return;
        if (data && typeof data.gb_balance !== "undefined") {
          const next = Number(data.gb_balance);
          writeCache(address, next);
          setBalance(next);
        } else {
          // No row yet — backfill via API (also handles ?ref= referral linking)
          const res = await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ walletAddress: address }),
          });
          const json = (await res.json().catch(() => ({}))) as {
            profile?: { gb_balance?: number };
          };
          if (cancelled) return;
          const next = Number(json.profile?.gb_balance ?? 0);
          writeCache(address, next);
          setBalance(next);
        }
      } catch (e) {
        console.warn("[useGbBalance] fetch failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Realtime subscription so other tabs / server-side updates flow in.
  useEffect(() => {
    if (!address) return;
    const channel = supabase
      .channel(`wallet_profiles:${address}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallet_profiles",
          filter: `wallet_address=eq.${address}`,
        },
        (payload) => {
          const next = Number(
            (payload.new as { gb_balance?: number })?.gb_balance ?? 0,
          );
          writeCache(address, next);
          setBalance(next);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [address]);

  /** Server-authoritative credit. Writes to Supabase first, then updates cache. */
  const add = useCallback(
    async (amount: number): Promise<number> => {
      if (amount <= 0) return balance;
      const addr = addressRef.current;
      if (!addr) {
        // Guest mode: local-only
        const next = Math.max(0, readCache(null) + amount);
        writeCache(null, next);
        setBalance(next);
        return next;
      }
      try {
        const res = await fetch("/api/award-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: addr, amount, reason: "gameplay" }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          balance?: number;
        };
        if (json.ok && typeof json.balance === "number") {
          writeCache(addr, json.balance);
          setBalance(json.balance);
          return json.balance;
        }
      } catch (e) {
        console.warn("[useGbBalance.add] server credit failed", e);
      }
      return balance;
    },
    [balance],
  );

  /**
   * Update local state/cache from a server response that already mutated
   * the balance (e.g. /api/buy-moves, /api/claim-streak).
   */
  const setFromServer = useCallback((next: number) => {
    const addr = addressRef.current;
    writeCache(addr, next);
    setBalance(next);
  }, []);

  /**
   * Optimistic spend check using the cached value. Real authorization is
   * server-side — callers should follow up with the appropriate API and
   * call `setFromServer(serverBalance)` with the returned value.
   */
  const spend = useCallback(
    (amount: number): boolean => {
      const addr = addressRef.current;
      const current = readCache(addr);
      if (current < amount) return false;
      if (!addr) {
        const next = current - amount;
        writeCache(null, next);
        setBalance(next);
      }
      return true;
    },
    [],
  );

  return { balance, add, spend, setFromServer };
}
