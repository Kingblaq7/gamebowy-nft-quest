import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BrowserProvider, formatEther, parseEther } from "ethers";
import { supabase } from "@/integrations/supabase/client";
import {
  ABEY_CHAIN_ID_DEC,
  ABEY_CHAIN_ID_HEX,
  ABEY_CHAIN_PARAMS,
  GAME_TREASURY_ADDRESS,
  REQUIRED_PAYMENT_ABEY,
} from "./abey";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: Eip1193Provider[];
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export type WalletKind = "metamask" | "rabby";

export type WalletState = {
  address: string | null;
  chainId: number | null;
  balanceAbey: string | null;
  paid: boolean;
  connecting: boolean;
  paying: boolean;
  error: string | null;
};

type Ctx = WalletState & {
  isInstalled: (kind: WalletKind) => boolean;
  connect: (kind: WalletKind) => Promise<boolean>;
  disconnect: () => void;
  ensureAbeyNetwork: () => Promise<boolean>;
  refreshBalance: () => Promise<void>;
  payToPlay: () => Promise<{ ok: true } | { ok: false; reason: string }>;
  checkPaidStatus: (address?: string) => Promise<boolean>;
};

const WalletContext = createContext<Ctx | null>(null);

const LS_ADDR = "gb_wallet_addr";
const LS_KIND = "gb_wallet_kind";

function pickProvider(kind: WalletKind): Eip1193Provider | null {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const eth = window.ethereum;
  // Multi-provider environments expose .providers[]
  const list: Eip1193Provider[] = eth.providers?.length ? eth.providers : [eth];
  if (kind === "metamask") {
    return list.find((p) => p.isMetaMask && !p.isRabby) ?? list.find((p) => p.isMetaMask) ?? null;
  }
  if (kind === "rabby") {
    return list.find((p) => p.isRabby) ?? null;
  }
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [kind, setKind] = useState<WalletKind | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balanceAbey, setBalanceAbey] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInstalled = useCallback((k: WalletKind) => !!pickProvider(k), []);

  const getEip = useCallback((): Eip1193Provider | null => {
    if (!kind) return null;
    return pickProvider(kind);
  }, [kind]);

  const checkPaidStatus = useCallback(async (addr?: string): Promise<boolean> => {
    const a = (addr ?? address)?.toLowerCase();
    if (!a) return false;
    const { data } = await supabase
      .from("paid_wallets")
      .select("wallet_address")
      .eq("wallet_address", a)
      .maybeSingle();
    const isPaid = !!data;
    setPaid(isPaid);
    return isPaid;
  }, [address]);

  const refreshBalance = useCallback(async () => {
    const eip = getEip();
    if (!eip || !address) return;
    try {
      const provider = new BrowserProvider(eip as never);
      const bal = await provider.getBalance(address);
      setBalanceAbey(formatEther(bal));
    } catch (e) {
      console.error("balance error", e);
    }
  }, [address, getEip]);

  const ensureAbeyNetwork = useCallback(async (): Promise<boolean> => {
    const eip = getEip();
    if (!eip) return false;
    try {
      const cid = (await eip.request({ method: "eth_chainId" })) as string;
      const decimal = parseInt(cid, 16);
      setChainId(decimal);
      if (decimal === ABEY_CHAIN_ID_DEC) return true;
      try {
        await eip.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ABEY_CHAIN_ID_HEX }],
        });
      } catch (switchErr) {
        const code = (switchErr as { code?: number })?.code;
        if (code === 4902 || code === -32603) {
          // Chain not added — request to add it
          await eip.request({
            method: "wallet_addEthereumChain",
            params: [ABEY_CHAIN_PARAMS],
          });
        } else {
          throw switchErr;
        }
      }
      const cid2 = (await eip.request({ method: "eth_chainId" })) as string;
      const decimal2 = parseInt(cid2, 16);
      setChainId(decimal2);
      return decimal2 === ABEY_CHAIN_ID_DEC;
    } catch (e) {
      const msg = (e as Error)?.message || "Failed to switch network";
      setError(msg);
      return false;
    }
  }, [getEip]);

  const connect = useCallback(async (k: WalletKind): Promise<boolean> => {
    setError(null);
    const eip = pickProvider(k);
    if (!eip) {
      setError(
        k === "metamask"
          ? "MetaMask not detected. Install it from metamask.io."
          : "Rabby not detected. Install it from rabby.io."
      );
      return false;
    }
    setConnecting(true);
    try {
      const accounts = (await eip.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) {
        setError("No accounts returned");
        return false;
      }
      const addr = accounts[0];
      setKind(k);
      setAddress(addr);
      localStorage.setItem(LS_ADDR, addr);
      localStorage.setItem(LS_KIND, k);

      const cid = (await eip.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(cid, 16));

      await checkPaidStatus(addr);
      return true;
    } catch (e) {
      const msg = (e as Error)?.message || "Connection rejected";
      setError(msg);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [checkPaidStatus]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setKind(null);
    setChainId(null);
    setBalanceAbey(null);
    setPaid(false);
    setError(null);
    localStorage.removeItem(LS_ADDR);
    localStorage.removeItem(LS_KIND);
  }, []);

  const payToPlay = useCallback(async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    setError(null);
    const eip = getEip();
    if (!eip || !address) return { ok: false, reason: "Wallet not connected" };

    const onAbey = await ensureAbeyNetwork();
    if (!onAbey) return { ok: false, reason: "Please switch to Abey Mainnet" };

    // Re-check balance just before sending
    let provider: BrowserProvider;
    try {
      provider = new BrowserProvider(eip as never);
      const bal = await provider.getBalance(address);
      const need = parseEther(REQUIRED_PAYMENT_ABEY);
      setBalanceAbey(formatEther(bal));
      if (bal < need) {
        return { ok: false, reason: `Insufficient balance. You need at least ${REQUIRED_PAYMENT_ABEY} ABEY.` };
      }
    } catch (e) {
      return { ok: false, reason: (e as Error)?.message || "Failed to read balance" };
    }

    setPaying(true);
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: GAME_TREASURY_ADDRESS,
        value: parseEther(REQUIRED_PAYMENT_ABEY),
      });
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        return { ok: false, reason: "Transaction failed on-chain" };
      }

      // Verify server-side
      const res = await fetch("/api/verify-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          transactionHash: tx.hash,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        return { ok: false, reason: json.error || "Server could not verify transaction" };
      }
      setPaid(true);
      await refreshBalance();
      return { ok: true };
    } catch (e) {
      const err = e as { code?: number | string; message?: string };
      const userRejected = err.code === 4001 || err.code === "ACTION_REJECTED";
      const reason = userRejected ? "Transaction rejected" : err.message || "Transaction failed";
      setError(reason);
      return { ok: false, reason };
    } finally {
      setPaying(false);
    }
  }, [address, ensureAbeyNetwork, getEip, refreshBalance]);

  // Reattach on reload
  useEffect(() => {
    const savedAddr = typeof window !== "undefined" ? localStorage.getItem(LS_ADDR) : null;
    const savedKind = typeof window !== "undefined" ? (localStorage.getItem(LS_KIND) as WalletKind | null) : null;
    if (!savedAddr || !savedKind) return;
    const eip = pickProvider(savedKind);
    if (!eip) return;
    (async () => {
      try {
        const accounts = (await eip.request({ method: "eth_accounts" })) as string[];
        if (accounts?.length && accounts[0].toLowerCase() === savedAddr.toLowerCase()) {
          setKind(savedKind);
          setAddress(accounts[0]);
          const cid = (await eip.request({ method: "eth_chainId" })) as string;
          setChainId(parseInt(cid, 16));
          await checkPaidStatus(accounts[0]);
        } else {
          localStorage.removeItem(LS_ADDR);
          localStorage.removeItem(LS_KIND);
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wallet event listeners
  useEffect(() => {
    const eip = getEip();
    if (!eip?.on) return;
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (!accounts?.length) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        localStorage.setItem(LS_ADDR, accounts[0]);
        void checkPaidStatus(accounts[0]);
      }
    };
    const onChainChanged = (...args: unknown[]) => {
      const cid = args[0] as string;
      setChainId(parseInt(cid, 16));
      void refreshBalance();
    };
    eip.on("accountsChanged", onAccountsChanged);
    eip.on("chainChanged", onChainChanged);
    return () => {
      eip.removeListener?.("accountsChanged", onAccountsChanged);
      eip.removeListener?.("chainChanged", onChainChanged);
    };
  }, [getEip, disconnect, checkPaidStatus, refreshBalance]);

  // Auto-refresh balance when address/chain changes
  useEffect(() => {
    if (address && chainId === ABEY_CHAIN_ID_DEC) void refreshBalance();
  }, [address, chainId, refreshBalance]);

  const value = useMemo<Ctx>(
    () => ({
      address,
      chainId,
      balanceAbey,
      paid,
      connecting,
      paying,
      error,
      isInstalled,
      connect,
      disconnect,
      ensureAbeyNetwork,
      refreshBalance,
      payToPlay,
      checkPaidStatus,
    }),
    [address, chainId, balanceAbey, paid, connecting, paying, error, isInstalled, connect, disconnect, ensureAbeyNetwork, refreshBalance, payToPlay, checkPaidStatus]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
