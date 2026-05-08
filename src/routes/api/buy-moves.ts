// Server verification + crediting for $ABEY move purchases.
//
// Flow:
//  1. Client sends ABEY tx directly to the Buy-Moves smart contract.
//  2. After wallet confirmation, client POSTs { walletAddress, transactionHash, quantity } here.
//  3. We verify the tx on Abey Mainnet:
//       - exists, status = success, enough confirmations
//       - sender == walletAddress
//       - recipient == MOVES_CONTRACT_ADDRESS
//       - value >= quantity * ABEY_PER_MOVE
//       - tx_hash never used before (replay protection)
//  4. We persist the purchase and increment user_move_balance.
//
// Moves are NEVER granted before successful on-chain confirmation.

import { createFileRoute } from "@tanstack/react-router";
import { JsonRpcProvider, formatEther, getAddress, parseEther } from "ethers";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { HttpError, requireSessionWallet } from "@/lib/siwe.server";
import {
  ABEY_PER_MOVE,
  MAX_MOVES,
  MIN_MOVES,
  MOVES_CONTRACT_ADDRESS,
  isMovesContractConfigured,
} from "@/web3/abeyMoves";

const ABEY_CHAIN_ID = 179;
const ABEY_RPC = "https://rpc.abeychain.com";
const MIN_CONFIRMATIONS = 1;

const Body = z.object({
  walletAddress: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{40}$/, "Invalid wallet address"),
  transactionHash: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{64}$/, "Invalid transaction hash"),
  quantity: z.number().int().min(MIN_MOVES).max(MAX_MOVES),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/buy-moves")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isMovesContractConfigured()) {
          return json(503, {
            ok: false,
            error: "Buy-Moves contract is not configured yet.",
          });
        }

        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json(400, { ok: false, error: "Invalid request body" });
        }

        try {
          requireSessionWallet(parsed.walletAddress);
        } catch (e) {
          if (e instanceof HttpError) return json(e.status, { ok: false, error: e.message });
          throw e;
        }

        const wallet = parsed.walletAddress;
        const txHash = parsed.transactionHash;
        const quantity = parsed.quantity;
        const contractAddr = MOVES_CONTRACT_ADDRESS.toLowerCase();
        const requiredWei = parseEther(String(quantity * ABEY_PER_MOVE));

        try {
          // Replay protection — tx hash globally unique.
          const { data: existing } = await supabaseAdmin
            .from("move_purchases")
            .select("tx_hash, wallet_address, moves_purchased")
            .eq("tx_hash", txHash)
            .maybeSingle();

          if (existing) {
            if (existing.wallet_address.toLowerCase() === wallet) {
              const { data: bal } = await supabaseAdmin
                .from("user_move_balance")
                .select("moves_balance")
                .eq("wallet_address", wallet)
                .maybeSingle();
              return json(200, {
                ok: true,
                alreadyVerified: true,
                movesGranted: existing.moves_purchased,
                balance: Number(bal?.moves_balance ?? 0),
              });
            }
            return json(409, {
              ok: false,
              error: "Transaction already used by another wallet",
            });
          }

          let provider: JsonRpcProvider;
          try {
            provider = new JsonRpcProvider(ABEY_RPC, ABEY_CHAIN_ID);
          } catch (e) {
            console.error("[buy-moves] RPC init failed", e);
            return json(200, { ok: false, error: "Blockchain unavailable" });
          }

          const [tx, receipt] = await Promise.all([
            provider.getTransaction(txHash),
            provider.getTransactionReceipt(txHash),
          ]).catch((e) => {
            console.error("[buy-moves] tx fetch failed", e);
            return [null, null] as const;
          });

          if (!tx || !receipt) {
            return json(200, {
              ok: false,
              error: "Transaction not found yet. Try again in a few seconds.",
            });
          }
          if (receipt.status !== 1) {
            return json(200, { ok: false, error: "Transaction failed on-chain" });
          }
          try {
            const conf = await receipt.confirmations();
            if (conf < MIN_CONFIRMATIONS) {
              return json(200, { ok: false, error: "Not enough confirmations yet" });
            }
          } catch {
            // ignore
          }

          let fromAddr = "";
          let toAddr = "";
          try {
            fromAddr = getAddress(tx.from).toLowerCase();
            toAddr = tx.to ? getAddress(tx.to).toLowerCase() : "";
          } catch {
            return json(200, { ok: false, error: "Invalid addresses in transaction" });
          }

          if (fromAddr !== wallet) {
            return json(200, {
              ok: false,
              error: "Transaction sender does not match wallet",
            });
          }
          if (toAddr !== contractAddr) {
            return json(200, {
              ok: false,
              error: "Transaction was not sent to the Buy-Moves contract",
            });
          }
          if (tx.value < requiredWei) {
            return json(200, {
              ok: false,
              error: `Insufficient payment. Need ${formatEther(requiredWei)} ABEY for ${quantity} moves.`,
            });
          }

          // Persist purchase (idempotent on tx_hash).
          const { error: insErr } = await supabaseAdmin
            .from("move_purchases")
            .insert({
              tx_hash: txHash,
              wallet_address: wallet,
              moves_purchased: quantity,
              amount_wei: tx.value.toString(),
              chain_id: ABEY_CHAIN_ID,
            });
          if (insErr && insErr.code !== "23505") {
            console.error("[buy-moves] insert failed", insErr);
            return json(500, { ok: false, error: "Could not record purchase" });
          }

          // Increment balance (server-authoritative).
          const { data: prev } = await supabaseAdmin
            .from("user_move_balance")
            .select("moves_balance")
            .eq("wallet_address", wallet)
            .maybeSingle();

          const nextBalance = Number(prev?.moves_balance ?? 0) + quantity;
          const { error: upErr } = await supabaseAdmin
            .from("user_move_balance")
            .upsert(
              { wallet_address: wallet, moves_balance: nextBalance },
              { onConflict: "wallet_address" }
            );
          if (upErr) {
            console.error("[buy-moves] balance upsert failed", upErr);
            return json(500, { ok: false, error: "Could not update balance" });
          }

          return json(200, {
            ok: true,
            movesGranted: quantity,
            balance: nextBalance,
          });
        } catch (e) {
          console.error("[buy-moves] unexpected", e);
          return json(500, { ok: false, error: "Unexpected error" });
        }
      },
    },
  },
});
