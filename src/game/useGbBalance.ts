import { useCallback, useEffect, useState } from "react";

const KEY = "gb_balance_local";
const EVENT = "gb_balance_changed";
const DEFAULT_STARTING_BALANCE = 50; // give new players enough to try a purchase

function read(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(KEY);
  if (raw === null) {
    window.localStorage.setItem(KEY, String(DEFAULT_STARTING_BALANCE));
    return DEFAULT_STARTING_BALANCE;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function write(n: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, String(n));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useGbBalance() {
  const [balance, setBalance] = useState<number>(() => read());

  useEffect(() => {
    const sync = () => setBalance(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback((amount: number) => {
    const next = Math.max(0, read() + amount);
    write(next);
    setBalance(next);
    return next;
  }, []);

  /** Deducts `amount` if affordable. Returns true on success, false if insufficient. */
  const spend = useCallback((amount: number): boolean => {
    const current = read();
    if (current < amount) return false;
    const next = current - amount;
    write(next);
    setBalance(next);
    return true;
  }, []);

  return { balance, add, spend };
}
