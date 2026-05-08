// Server-only SIWE (Sign-In With Ethereum) helpers.
// Issues nonces, verifies signatures, and manages an HTTP-only session cookie
// containing the authenticated wallet address. Service-role DB access is used
// to persist nonces (single-use, time-limited).

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { verifyMessage } from "ethers";
import { getCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SESSION_COOKIE = "gb_siwe";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

function getSecret(): string {
  const s = process.env.SIWE_SESSION_SECRET;
  if (!s) throw new Error("SIWE_SESSION_SECRET is not configured");
  return s;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

/** Issue a fresh nonce for a wallet (stored server-side, single-use, 10 min TTL). */
export async function issueNonce(walletRaw: string): Promise<{
  nonce: string;
  message: string;
  issuedAt: string;
}> {
  if (!WALLET_RE.test(walletRaw)) throw new Error("Invalid wallet address");
  const wallet = walletRaw.toLowerCase();
  const nonce = b64url(randomBytes(16));
  const issuedAt = new Date().toISOString();
  const { error } = await supabaseAdmin.from("wallet_nonces").insert({
    nonce,
    wallet_address: wallet,
  });
  if (error) throw error;
  const message = buildMessage(wallet, nonce, issuedAt);
  return { nonce, message, issuedAt };
}

export function buildMessage(
  wallet: string,
  nonce: string,
  issuedAt: string,
): string {
  return [
    "Gamebowy wants you to sign in with your Ethereum account:",
    wallet,
    "",
    "Sign this message to prove you own this wallet. No transaction will be sent and no fees are charged.",
    "",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

/** Verify a signature for a previously-issued nonce; consumes the nonce. */
export async function verifySignature(args: {
  walletAddress: string;
  nonce: string;
  issuedAt: string;
  signature: string;
}): Promise<{ ok: true; wallet: string } | { ok: false; error: string }> {
  if (!WALLET_RE.test(args.walletAddress)) return { ok: false, error: "Invalid wallet" };
  const wallet = args.walletAddress.toLowerCase();

  const { data: row } = await supabaseAdmin
    .from("wallet_nonces")
    .select("nonce, wallet_address, expires_at, used_at")
    .eq("nonce", args.nonce)
    .maybeSingle();
  if (!row) return { ok: false, error: "Unknown nonce" };
  if (row.used_at) return { ok: false, error: "Nonce already used" };
  if (new Date(row.expires_at).getTime() < Date.now())
    return { ok: false, error: "Nonce expired" };
  if (row.wallet_address.toLowerCase() !== wallet)
    return { ok: false, error: "Wallet mismatch" };

  const message = buildMessage(wallet, args.nonce, args.issuedAt);
  let recovered: string;
  try {
    recovered = verifyMessage(message, args.signature);
  } catch {
    return { ok: false, error: "Invalid signature" };
  }
  if (recovered.toLowerCase() !== wallet)
    return { ok: false, error: "Signature does not match wallet" };

  await supabaseAdmin
    .from("wallet_nonces")
    .update({ used_at: new Date().toISOString() })
    .eq("nonce", args.nonce);

  return { ok: true, wallet };
}

/** Build a signed cookie value: `<wallet>.<expiresAt>.<sig>`. */
export function buildSessionCookie(wallet: string): {
  value: string;
  maxAgeSeconds: number;
} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${wallet}.${expiresAt}`;
  const sig = sign(payload);
  return { value: `${payload}.${sig}`, maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000) };
}

/** Read & validate the session cookie. Returns the authenticated wallet or null. */
export function readSessionWallet(): string | null {
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [wallet, expiresAtStr, sig] = parts;
  if (!WALLET_RE.test(wallet)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const expected = sign(`${wallet}.${expiresAtStr}`);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return wallet.toLowerCase();
}

/**
 * Require an authenticated wallet from the session cookie. Optionally enforce
 * that it matches a wallet address provided in the request body.
 */
export function requireSessionWallet(expected?: string | null): string {
  const w = readSessionWallet();
  if (!w) throw new HttpError(401, "Wallet sign-in required");
  if (expected && expected.toLowerCase() !== w)
    throw new HttpError(403, "Wallet does not match session");
  return w;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
