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

// TODO: replace with the deployed Buy-Moves contract address.
export const MOVES_CONTRACT_ADDRESS =
  "0x0000000000000000000000000000000000000000";

// TODO: replace with the final ABI. Expected to expose a payable
// function `buyMoves(uint256 quantity)` that emits a `MovesPurchased` event.
// The current minimal stub lets the dApp encode the call as soon as the
// real ABI is dropped in.
export const MOVES_CONTRACT_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "quantity", type: "uint256" }],
    name: "buyMoves",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "quantity", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "MovesPurchased",
    type: "event",
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
