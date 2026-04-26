// Abey Mainnet config + Gamebowy smart contract.
// Treasury and chain are exposed publicly (anyone can verify on-chain).
export const ABEY_CHAIN_ID_DEC = 179;
export const ABEY_CHAIN_ID_HEX = "0xb3"; // 179
export const ABEY_CHAIN_PARAMS = {
  chainId: ABEY_CHAIN_ID_HEX,
  chainName: "Abey Mainnet",
  nativeCurrency: { name: "ABEY", symbol: "ABEY", decimals: 18 },
  rpcUrls: ["https://rpc.abeychain.com"],
  blockExplorerUrls: ["https://explorer.abeychain.com"],
};

// Deployed Gamebowy access contract on Abey Mainnet.
// Source of truth for paid / admin status via canPlay(address).
export const GAMEBOWY_CONTRACT_ADDRESS =
  "0xCBAD1110e02E80F6d752c5f85c2Ed2E83485D114";

// Kept for backward-compatible UI labels (treasury == contract that holds funds).
export const GAME_TREASURY_ADDRESS = GAMEBOWY_CONTRACT_ADDRESS;

// One-time fee required to unlock the game forever (per wallet).
export const REQUIRED_PAYMENT_ABEY = "2";

// Minimal ABI used by the dApp.
export const GAMEBOWY_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "canPlay",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "hasPaid",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isAdmin",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "playFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "payToPlay",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "PlayerPaid",
    type: "event",
  },
] as const;
