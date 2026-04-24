import { createFileRoute } from "@tanstack/react-router";
import { JsonRpcProvider, formatEther, parseEther, getAddress } from "ethers";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ABEY_CHAIN_ID = 179;
const ABEY_RPC = "https://rpc.abeychain.com";
const TREASURY = "0x3A568b1a39365d8278428a1512DAB52b44C17735";
const REQUIRED_WEI = parseEther("2");
const MIN_CONFIRMATIONS = 1;

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
        let parsed: z.infer<typeof Body>;
        try {
          const raw = await request.json();
          parsed = Body.parse(raw);
        } catch {
          return json(400, { ok: false, error: "Invalid request body" });
        }

        const wallet = parsed.walletAddress.toLowerCase();
        const txHash = parsed.transactionHash.toLowerCase();
        const treasury = TREASURY.toLowerCase();

        // Replay protection: if this tx was already used, reject (unless same wallet already paid)
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

        // Wallet already paid with a different tx — accept silently
        const { data: existingWallet } = await supabaseAdmin
          .from("paid_wallets")
          .select("wallet_address")
          .eq("wallet_address", wallet)
          .maybeSingle();
        if (existingWallet) {
          return json(200, { ok: true, alreadyPaid: true });
        }

        // Verify on-chain
        let provider: JsonRpcProvider;
        try {
          provider = new JsonRpcProvider(ABEY_RPC, ABEY_CHAIN_ID);
        } catch (e) {
          console.error("RPC init failed", e);
          return json(502, { ok: false, error: "Could not connect to Abey RPC" });
        }

        let tx: Awaited<ReturnType<JsonRpcProvider["getTransaction"]>> = null;
        let receipt: Awaited<ReturnType<JsonRpcProvider["getTransactionReceipt"]>> = null;
        try {
          [tx, receipt] = await Promise.all([
            provider.getTransaction(txHash),
            provider.getTransactionReceipt(txHash),
          ]);
        } catch (e) {
          console.error("Tx fetch failed", e);
          return json(502, { ok: false, error: "Failed to fetch transaction" });
        }

        if (!tx || !receipt) {
          return json(404, { ok: false, error: "Transaction not found yet. Try again in a few seconds." });
        }
        if (receipt.status !== 1) {
          return json(400, { ok: false, error: "Transaction failed on-chain" });
        }

        // Confirmations
        try {
          const conf = await receipt.confirmations();
          if (conf < MIN_CONFIRMATIONS) {
            return json(400, { ok: false, error: "Not enough confirmations yet" });
          }
        } catch {
          // older ethers fallback — skip if unavailable
        }

        // Validate from / to / value
        let fromAddr = "";
        let toAddr = "";
        try {
          fromAddr = getAddress(tx.from).toLowerCase();
          toAddr = tx.to ? getAddress(tx.to).toLowerCase() : "";
        } catch {
          return json(400, { ok: false, error: "Invalid addresses in transaction" });
        }

        if (fromAddr !== wallet) {
          return json(400, { ok: false, error: "Transaction sender does not match wallet" });
        }
        if (toAddr !== treasury) {
          return json(400, { ok: false, error: "Transaction recipient is not the game treasury" });
        }
        if (tx.value < REQUIRED_WEI) {
          return json(400, {
            ok: false,
            error: `Insufficient amount. Sent ${formatEther(tx.value)} ABEY, need 2 ABEY.`,
          });
        }
        if (tx.chainId !== undefined && Number(tx.chainId) !== ABEY_CHAIN_ID) {
          return json(400, { ok: false, error: "Transaction is not on Abey Mainnet" });
        }

        // Persist
        const { error: insertErr } = await supabaseAdmin.from("paid_wallets").insert({
          wallet_address: wallet,
          tx_hash: txHash,
          amount_wei: tx.value.toString(),
          chain_id: ABEY_CHAIN_ID,
        });
        if (insertErr) {
          // Unique violation — treat as already paid
          if (insertErr.code === "23505") {
            return json(200, { ok: true, alreadyPaid: true });
          }
          console.error("DB insert failed", insertErr);
          return json(500, { ok: false, error: "Could not store payment record" });
        }

        return json(200, { ok: true });
      },
    },
  },
});
