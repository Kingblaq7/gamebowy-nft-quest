/**
 * Client-side SIWE helper. Asks the connected EIP-1193 provider to sign a
 * server-issued nonce, then exchanges the signature for a session cookie.
 */
type Eip = {
  request: (a: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

const SIGNED_KEY = "gb_siwe_signed_v1";

export function isLocallyMarkedSignedIn(wallet: string): boolean {
  try {
    return localStorage.getItem(SIGNED_KEY) === wallet.toLowerCase();
  } catch {
    return false;
  }
}

export async function checkServerSession(): Promise<string | null> {
  try {
    const r = await fetch("/api/auth/session", { credentials: "include" });
    const j = (await r.json().catch(() => ({}))) as { wallet?: string | null };
    return j.wallet ?? null;
  } catch {
    return null;
  }
}

export async function siweSignIn(eip: Eip, walletAddress: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const wallet = walletAddress.toLowerCase();
  try {
    const nonceRes = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: wallet }),
    });
    if (!nonceRes.ok) return { ok: false, error: "Could not start sign-in" };
    const { nonce, message, issuedAt } = (await nonceRes.json()) as {
      nonce: string;
      message: string;
      issuedAt: string;
    };

    const signature = (await eip.request({
      method: "personal_sign",
      params: [message, wallet],
    })) as string;

    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: wallet, nonce, issuedAt, signature }),
    });
    if (!verifyRes.ok) {
      const j = (await verifyRes.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: j.error ?? "Sign-in failed" };
    }
    try {
      localStorage.setItem(SIGNED_KEY, wallet);
    } catch {
      // ignore
    }
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: number | string })?.code;
    if (code === 4001 || code === "ACTION_REJECTED")
      return { ok: false, error: "Signature rejected" };
    return { ok: false, error: (e as Error)?.message || "Sign-in failed" };
  }
}

export async function siweSignOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(SIGNED_KEY);
  } catch {
    // ignore
  }
}
