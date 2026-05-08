import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/web3/WalletProvider";

/**
 * GB balance hook — server is the source of truth.
 *
 * Reads come from /api/wallet/profile (SIWE-protected, owner-only). Local
 * storage is used purely as a per-wallet cache so the UI renders a number
 * instantly on cold load before the network round-trip completes.
 *
 * Mutations: this hook intentionally does NOT expose a client `add()`
 * function — token credits MUST happen server-side (e.g. /api/claim-streak,
 * /api/profile referral path). Use `setFromServer(balance)` after a server
 * response, or `refresh()` to re-pull from the server.
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

async function fetchServerBalance(wallet: string): Promise<number | null> {
  try {
    const res = await fetch(
      `/api/wallet/profile?walletAddress=${encodeURIComponent(wallet)}`,
      { credentials: "include" },
    );
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as {
      profile?: { gb_balance?: number } | null;
    };
    if (json.profile && typeof json.profile.gb_balance !== "undefined") {
      return Number(json.profile.gb_balance);
    }
    return null;
  } catch {
    return null;
  }
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

  // On wallet change, immediately reflect cached value, then fetch server.
  useEffect(() => {
    setBalance(readCache(address));
    if (!address) return;
    let cancelled = false;
    (async () => {
      const next = await fetchServerBalance(address);
      if (cancelled || next === null) return;
      writeCache(address, next);
      setBalance(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  /**
   * Update local state/cache from a server response that already mutated
   * the balance (e.g. /api/buy-moves, /api/claim-streak).
   */
  const setFromServer = useCallback((next: number) => {
    const addr = addressRef.current;
    writeCache(addr, next);
    setBalance(next);
  }, []);

  const refresh = useCallback(async () => {
    const addr = addressRef.current;
    if (!addr) return;
    const next = await fetchServerBalance(addr);
    if (next === null) return;
    writeCache(addr, next);
    setBalance(next);
  }, []);

  /**
   * Optimistic spend check using the cached value. Real authorization is
   * server-side — callers should follow up with the appropriate API and
   * call `setFromServer(serverBalance)` with the returned value.
   */
  const spend = useCallback((amount: number): boolean => {
    const addr = addressRef.current;
    const current = readCache(addr);
    if (current < amount) return false;
    if (!addr) {
      const next = current - amount;
      writeCache(null, next);
      setBalance(next);
    }
    return true;
  }, []);

  return { balance, spend, setFromServer, refresh };
}
