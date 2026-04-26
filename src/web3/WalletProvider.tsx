import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import {
  ABEY_CHAIN_ID_DEC,
  ABEY_CHAIN_ID_HEX,
  ABEY_CHAIN_PARAMS,
  GAMEBOWY_ABI,
  GAMEBOWY_CONTRACT_ADDRESS,
  REQUIRED_PAYMENT_ABEY,
} from "./abey";

// Read-only provider for canPlay() checks. Lazy-init so a bad RPC at startup
// can never blank-screen the app (SSR or client).
let _readProvider: JsonRpcProvider | null = null;
function getReadProvider(): JsonRpcProvider | null {
  if (_readProvider) return _readProvider;
  try {
    _readProvider = new JsonRpcProvider(ABEY_CHAIN_PARAMS.rpcUrls[0], ABEY_CHAIN_ID_DEC);
    return _readProvider;
  } catch (e) {
    console.warn("[wallet] failed to init read provider", e);
    return null;
  }
}

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

export type WalletRole = "admin" | "user";

export type WalletState = {
  address: string | null;
  chainId: number | null;
  balanceAbey: string | null;
  paid: boolean;
  role: WalletRole;
  isAdmin: boolean;
  /** True if the wallet can enter the game (paid OR admin). */
  hasAccess: boolean;
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
  checkRole: (address?: string) => Promise<WalletRole>;
};

const WalletContext = createContext<Ctx | null>(null);

const LS_ADDR = "gb_wallet_addr";
const LS_KIND = "gb_wallet_kind";
const LS_REF = "gb_referrer";

/** Read ?ref=<wallet> from the current URL and persist it (so it survives navigation). */
function captureReferralFromURL(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref && /^0x[a-fA-F0-9]{40}$/.test(ref)) {
      const norm = ref.toLowerCase();
      localStorage.setItem(LS_REF, norm);
      return norm;
    }
  } catch {
    // ignore
  }
  return localStorage.getItem(LS_REF);
}

/** Notify backend a wallet has connected; also applies any captured referral. */
async function ensureProfileOnServer(wallet: string): Promise<void> {
  try {
    const ref = captureReferralFromURL();
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: wallet, ref: ref ?? undefined }),
    });
  } catch (e) {
    console.warn("[wallet] ensureProfileOnServer failed", e);
  }
}

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
  const [role, setRole] = useState<WalletRole>("user");
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
    try {
      const provider = getReadProvider();
      if (!provider) return false;
      // canPlay() returns true for paid wallets AND admins set on the contract.
      const contract = new Contract(GAMEBOWY_CONTRACT_ADDRESS, GAMEBOWY_ABI, provider);
      const canPlay = (await contract.canPlay(a)) as boolean;
      setPaid(canPlay);
      return canPlay;
    } catch (e) {
      console.warn("[wallet] canPlay() check failed (RPC unavailable)", e);
      return false;
    }
  }, [address]);

  const checkRole = useCallback(async (addr?: string): Promise<WalletRole> => {
    const a = (addr ?? address)?.toLowerCase();
    if (!a) return "user";
    try {
      const res = await fetch("/api/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: a }),
      });
      const json = (await res.json().catch(() => ({}))) as { role?: WalletRole };
      const r: WalletRole = json.role === "admin" ? "admin" : "user";
      setRole(r);
      return r;
    } catch (e) {
      console.warn("[wallet] role check failed", e);
      setRole("user");
      return "user";
    }
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

      await Promise.all([
        checkPaidStatus(addr),
        checkRole(addr),
        ensureProfileOnServer(addr),
      ]);
      return true;
    } catch (e) {
      const msg = (e as Error)?.message || "Connection rejected";
      setError(msg);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [checkPaidStatus, checkRole]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setKind(null);
    setChainId(null);
    setBalanceAbey(null);
    setPaid(false);
    setRole("user");
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
      const contract = new Contract(GAMEBOWY_CONTRACT_ADDRESS, GAMEBOWY_ABI, signer);

      // Sanity check: if the contract already says canPlay, skip the tx.
      try {
        const already = (await contract.canPlay(address)) as boolean;
        if (already) {
          setPaid(true);
          return { ok: true };
        }
      } catch {
        // non-fatal — continue to attempt payment
      }

      // Read on-chain fee (falls back to constant).
      let value = parseEther(REQUIRED_PAYMENT_ABEY);
      try {
        const feeWei = (await contract.playFee()) as bigint;
        if (typeof feeWei === "bigint" && feeWei > 0n) value = feeWei;
      } catch {
        // ignore — use default
      }

      const tx = await contract.payToPlay({ value });
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        return { ok: false, reason: "Transaction failed on-chain" };
      }

      // Best-effort server record (DB log of payment). Access is enforced on-chain.
      try {
        await fetch("/api/verify-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            transactionHash: tx.hash,
          }),
        });
      } catch (e) {
        console.warn("[wallet] server-side payment record failed", e);
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
          await Promise.all([
            checkPaidStatus(accounts[0]),
            checkRole(accounts[0]),
            ensureProfileOnServer(accounts[0]),
          ]);
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
        void checkRole(accounts[0]);
        void ensureProfileOnServer(accounts[0]);
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
  }, [getEip, disconnect, checkPaidStatus, checkRole, refreshBalance]);

  // Auto-refresh balance when address/chain changes
  useEffect(() => {
    if (address && chainId === ABEY_CHAIN_ID_DEC) void refreshBalance();
  }, [address, chainId, refreshBalance]);

  const isAdmin = role === "admin";
  const hasAccess = paid || isAdmin;

  const value = useMemo<Ctx>(
    () => ({
      address,
      chainId,
      balanceAbey,
      paid,
      role,
      isAdmin,
      hasAccess,
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
      checkRole,
    }),
    [address, chainId, balanceAbey, paid, role, isAdmin, hasAccess, connecting, paying, error, isInstalled, connect, disconnect, ensureAbeyNetwork, refreshBalance, payToPlay, checkPaidStatus, checkRole]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    // Safe fallback so a missing provider can never crash the UI.
    console.warn("useWallet used outside <WalletProvider>; returning inert stub.");
    const noop = async () => false;
    return {
      address: null,
      chainId: null,
      balanceAbey: null,
      paid: false,
      role: "user" as const,
      isAdmin: false,
      hasAccess: false,
      connecting: false,
      paying: false,
      error: null,
      isInstalled: () => false,
      connect: noop,
      disconnect: () => {},
      ensureAbeyNetwork: noop,
      refreshBalance: async () => {},
      payToPlay: async () => ({ ok: false as const, reason: "Wallet provider unavailable" }),
      checkPaidStatus: noop,
      checkRole: async () => "user" as const,
    } as unknown as Ctx;
  }
  return ctx;
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
