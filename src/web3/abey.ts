// Abey Mainnet config + payment constants.
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

// Treasury wallet that receives the 2 ABEY one-time access fee.
export const GAME_TREASURY_ADDRESS =
  (import.meta.env.VITE_GAME_TREASURY_ADDRESS as string | undefined) ||
  "0x3A568b1a39365d8278428a1512DAB52b44C17735";

// One-time fee required to unlock the game forever (per wallet).
export const REQUIRED_PAYMENT_ABEY = "2";
