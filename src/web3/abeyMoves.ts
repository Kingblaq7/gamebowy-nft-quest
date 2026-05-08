// Configuration for the $ABEY "Buy Moves" smart contract.
//
// IMPORTANT: The user will provide the final contract address and ABI.
// Until then, MOVES_CONTRACT_ADDRESS is the empty zero address and
// purchases will be blocked client-side.
//
// Pricing: 1 move = 2 ABEY. Default package = 10 moves (20 ABEY).
// Frontend sends 100% of payment to the contract; the contract handles
// 30% treasury / 70% burn split internally.

export const MOVES_PER_PACKAGE_DEFAULT = 10;
export const ABEY_PER_MOVE = 2; // 1 move = 2 $ABEY
export const MIN_MOVES = 1;
export const MAX_MOVES = 200;

// Deployed Buy-Moves contract on Abey Mainnet (chain id 179).
// Contract internally splits payment: 30% treasury / 70% burn.
export const MOVES_CONTRACT_ADDRESS =
  "0x2878c0FF014B4119Dd772415bd97ECD01F1C5eaf";

// Treasury / burn split is enforced inside the contract.
export const TREASURY_PCT = 30;
export const BURN_PCT = 70;

// Minimal ABI matching the deployed contract.
export const MOVES_CONTRACT_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "moveAmount", type: "uint256" }],
    name: "buyMoves",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export function isMovesContractConfigured(): boolean {
  return (
    MOVES_CONTRACT_ADDRESS.toLowerCase() !==
    "0x0000000000000000000000000000000000000000"
  );
}

export function totalAbeyForMoves(qty: number): number {
  return Math.max(0, qty) * ABEY_PER_MOVE;
}
