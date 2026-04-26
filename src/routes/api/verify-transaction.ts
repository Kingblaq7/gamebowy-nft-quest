import { createFileRoute } from "@tanstack/react-router";
import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ABEY_CHAIN_ID = 179;
const ABEY_RPC = "https://rpc.abeychain.com";
const CONTRACT_ADDRESS = "0xCBAD1110e02E80F6d752c5f85c2Ed2E83485D114";
const MIN_CONFIRMATIONS = 1;

const CONTRACT_ABI = [
  "function canPlay(address user) view returns (bool)",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const Body = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export const Route = createFileRoute("/api/verify-transaction")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          let parsed: z.infer<typeof Body>;
          try {
            const raw = await request.json();
            parsed = Body.parse(raw);
          } catch {
            return json(400, { ok: false, error: "Invalid request body" });
          }

          const wallet = parsed.walletAddress.toLowerCase();
          const txHash = parsed.transactionHash.toLowerCase();
          const contractAddr = CONTRACT_ADDRESS.toLowerCase();

          // Replay protection
          const { data: existingTx } = await supabaseAdmin
            .from("paid_wallets")
            .select("wallet_address, tx_hash")
            .eq("tx_hash", txHash)
            .maybeSingle();

          if (existingTx) {
            if (existingTx.wallet_address.toLowerCase() === wallet) {
              return json(200, { ok: true, alreadyVerified: true });
            }
            return json(409, { ok: false, error: "Transaction already used by another wallet" });
          }

          let provider: JsonRpcProvider;
          try {
            provider = new JsonRpcProvider(ABEY_RPC, ABEY_CHAIN_ID);
          } catch (e) {
            console.error("RPC init failed", e);
            return json(200, { ok: false, error: "Blockchain unavailable" });
          }

          // Fetch tx + receipt
          let tx: Awaited<ReturnType<JsonRpcProvider["getTransaction"]>> = null;
          let receipt: Awaited<ReturnType<JsonRpcProvider["getTransactionReceipt"]>> = null;
          try {
            [tx, receipt] = await Promise.all([
              provider.getTransaction(txHash),
              provider.getTransactionReceipt(txHash),
            ]);
          } catch (e) {
            console.error("Tx fetch failed", e);
            return json(200, { ok: false, error: "Blockchain unavailable" });
          }

          if (!tx || !receipt) {
            return json(200, { ok: false, error: "Transaction not found yet. Try again in a few seconds." });
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
            // fallback — skip
          }

          // Validate sender + recipient (must be the smart contract)
          let fromAddr = "";
          let toAddr = "";
          try {
            fromAddr = getAddress(tx.from).toLowerCase();
            toAddr = tx.to ? getAddress(tx.to).toLowerCase() : "";
          } catch {
            return json(200, { ok: false, error: "Invalid addresses in transaction" });
          }

          if (fromAddr !== wallet) {
            return json(200, { ok: false, error: "Transaction sender does not match wallet" });
          }
          if (toAddr !== contractAddr) {
            return json(200, { ok: false, error: "Transaction was not sent to the Gamebowy contract" });
          }

          // Authoritative on-chain access check
          try {
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const canPlay = (await contract.canPlay(wallet)) as boolean;
            if (!canPlay) {
              return json(200, { ok: false, error: "Contract does not yet recognize wallet as paid" });
            }
          } catch (e) {
            console.error("canPlay() check failed", e);
            return json(200, { ok: false, error: "Blockchain unavailable" });
          }

          // Persist payment record (idempotent)
          const { error: insertErr } = await supabaseAdmin.from("paid_wallets").insert({
            wallet_address: wallet,
            tx_hash: txHash,
            amount_wei: tx.value.toString(),
            chain_id: ABEY_CHAIN_ID,
          });
          if (insertErr && insertErr.code !== "23505") {
            console.error("DB insert failed", insertErr);
            // Non-fatal — access is enforced on-chain
          }

          return json(200, { ok: true });
        } catch (e) {
          console.error("[verify-transaction] unexpected error", e);
          return json(200, { ok: false, error: "Verification temporarily unavailable" });
        }
      },
    },
  },
});
