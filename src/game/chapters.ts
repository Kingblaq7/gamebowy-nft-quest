import tileCrystal from "@/assets/tile-crystal.png";
import tileOrb from "@/assets/tile-orb.png";
import tileStar from "@/assets/tile-star.png";
import tileCoin from "@/assets/tile-coin.png";
import tileGem from "@/assets/tile-gem.png";
import tileMoon from "@/assets/tile-moon.png";

export type TileType = {
  id: number;
  src: string;
  name: string;
  color: string;
};

export const TILE_TYPES: TileType[] = [
  { id: 0, src: tileCrystal, name: "Crystal", color: "oklch(0.72 0.25 320)" },
  { id: 1, src: tileOrb, name: "Orb", color: "oklch(0.65 0.22 265)" },
  { id: 2, src: tileStar, name: "Star", color: "oklch(0.72 0.25 340)" },
  { id: 3, src: tileCoin, name: "Coin", color: "oklch(0.82 0.18 80)" },
  { id: 4, src: tileGem, name: "Gem", color: "oklch(0.7 0.2 150)" },
  { id: 5, src: tileMoon, name: "Moon", color: "oklch(0.85 0.05 300)" },
];

export type Objective =
  | { kind: "score"; target: number }
  | { kind: "collect"; tileId: number; count: number }
  | { kind: "combo"; count: number };

export type LevelDef = {
  num: number;        // 1..4
  name: string;
  moves: number;
  size: number;       // grid size, default 6
  objective: Objective;
  starThresholds: [number, number, number]; // score for 1, 2, 3 stars
  reward: { tokens: number; nft: string };
  tilePool?: number[]; // restrict tile types if desired
};

export type ChapterDef = {
  num: number; // 1..10
  name: string;
  tagline: string;
  hue: string;          // oklch hue for chapter accent
  iconSrc: string;
  bgGradient: string;
  rareReward: { tokens: number; nft: string };
  levels: LevelDef[];
};

const tile = (i: number) => TILE_TYPES[i].id;

export const CHAPTERS: ChapterDef[] = [
  {
    num: 1, name: "Genesis Nebula", tagline: "Where it all begins.", hue: "320", iconSrc: tileCrystal,
    bgGradient: "linear-gradient(135deg, oklch(0.3 0.15 320), oklch(0.18 0.1 280))",
    rareReward: { tokens: 250, nft: "Genesis Crystal" },
    levels: [
      { num: 1, name: "First Light", moves: 12, size: 6, objective: { kind: "score", target: 1500 }, starThresholds: [1500, 2500, 4000], reward: { tokens: 25, nft: "Spark Tile" } },
      { num: 2, name: "Pulse Wave", moves: 20, size: 6, objective: { kind: "score", target: 2500 }, starThresholds: [2500, 4000, 6000], reward: { tokens: 30, nft: "Pulse Shard" } },
      { num: 3, name: "Crystal Hunt", moves: 22, size: 6, objective: { kind: "collect", tileId: tile(0), count: 18 }, starThresholds: [2000, 3500, 5000], reward: { tokens: 40, nft: "Hunter Crystal" } },
      { num: 4, name: "Genesis Burst", moves: 25, size: 6, objective: { kind: "combo", count: 5 }, starThresholds: [3000, 5000, 7500], reward: { tokens: 50, nft: "Burst Core" } },
    ],
  },
  {
    num: 2, name: "Tide of Orbs", tagline: "A rolling sea of plasma.", hue: "265", iconSrc: tileOrb,
    bgGradient: "linear-gradient(135deg, oklch(0.3 0.18 265), oklch(0.15 0.12 250))",
    rareReward: { tokens: 320, nft: "Tidal Orb" },
    levels: [
      { num: 1, name: "Ripple", moves: 12, size: 6, objective: { kind: "score", target: 3000 }, starThresholds: [3000, 4500, 6500], reward: { tokens: 35, nft: "Ripple Drop" } },
      { num: 2, name: "Orb Cascade", moves: 10, size: 6, objective: { kind: "collect", tileId: tile(1), count: 22 }, starThresholds: [2500, 4000, 6000], reward: { tokens: 45, nft: "Cascade Orb" } },
      { num: 3, name: "Twin Currents", moves: 12, size: 6, objective: { kind: "combo", count: 6 }, starThresholds: [3500, 5500, 8000], reward: { tokens: 55, nft: "Current Pearl" } },
      { num: 4, name: "Tidal Bloom", moves: 10, size: 6, objective: { kind: "score", target: 5000 }, starThresholds: [5000, 7000, 10000], reward: { tokens: 65, nft: "Bloom Sphere" } },
    ],
  },
  {
    num: 3, name: "Stellar Bloom", tagline: "Stars unfurl their petals.", hue: "340", iconSrc: tileStar,
    bgGradient: "linear-gradient(135deg, oklch(0.32 0.2 340), oklch(0.18 0.14 320))",
    rareReward: { tokens: 400, nft: "Bloomstar" },
    levels: [
      { num: 1, name: "Petal Fall", moves: 12, size: 6, objective: { kind: "collect", tileId: tile(2), count: 20 }, starThresholds: [3000, 4500, 6500], reward: { tokens: 45, nft: "Stellar Petal" } },
      { num: 2, name: "Star Cluster", moves: 10, size: 6, objective: { kind: "score", target: 4500 }, starThresholds: [4500, 6500, 9000], reward: { tokens: 55, nft: "Cluster Bead" } },
      { num: 3, name: "Nova Spin", moves: 10, size: 6, objective: { kind: "combo", count: 7 }, starThresholds: [4000, 6000, 9000], reward: { tokens: 65, nft: "Nova Spark" } },
      { num: 4, name: "Bloom Crown", moves: 12, size: 7, objective: { kind: "score", target: 7000 }, starThresholds: [7000, 9500, 13000], reward: { tokens: 75, nft: "Crown Shard" } },
    ],
  },
  {
    num: 4, name: "Forge of Coins", tagline: "Where the cosmos mints itself.", hue: "80", iconSrc: tileCoin,
    bgGradient: "linear-gradient(135deg, oklch(0.32 0.16 80), oklch(0.18 0.1 60))",
    rareReward: { tokens: 500, nft: "Forge Sigil" },
    levels: [
      { num: 1, name: "Smelt", moves: 12, size: 6, objective: { kind: "collect", tileId: tile(3), count: 24 }, starThresholds: [3500, 5000, 7000], reward: { tokens: 55, nft: "Molten Coin" } },
      { num: 2, name: "Ingot Run", moves: 10, size: 6, objective: { kind: "score", target: 5500 }, starThresholds: [5500, 7500, 10500], reward: { tokens: 65, nft: "Ingot Disc" } },
      { num: 3, name: "Anvil Strike", moves: 10, size: 6, objective: { kind: "combo", count: 8 }, starThresholds: [5000, 7000, 10000], reward: { tokens: 75, nft: "Anvil Mark" } },
      { num: 4, name: "Mint Master", moves: 12, size: 7, objective: { kind: "score", target: 8000 }, starThresholds: [8000, 11000, 15000], reward: { tokens: 90, nft: "Master Coin" } },
    ],
  },
  {
    num: 5, name: "Verdant Void", tagline: "Life blooms in the darkness.", hue: "150", iconSrc: tileGem,
    bgGradient: "linear-gradient(135deg, oklch(0.3 0.16 150), oklch(0.16 0.1 170))",
    rareReward: { tokens: 600, nft: "Verdant Heart" },
    levels: [
      { num: 1, name: "Mossfall", moves: 32, size: 6, objective: { kind: "collect", tileId: tile(4), count: 26 }, starThresholds: [4000, 6000, 8500], reward: { tokens: 65, nft: "Moss Gem" } },
      { num: 2, name: "Vine Spiral", moves: 30, size: 7, objective: { kind: "score", target: 6500 }, starThresholds: [6500, 9000, 12500], reward: { tokens: 75, nft: "Vine Bead" } },
      { num: 3, name: "Bloom Storm", moves: 30, size: 7, objective: { kind: "combo", count: 9 }, starThresholds: [6000, 8500, 12000], reward: { tokens: 85, nft: "Storm Petal" } },
      { num: 4, name: "Verdant Pulse", moves: 32, size: 7, objective: { kind: "score", target: 9000 }, starThresholds: [9000, 12500, 17000], reward: { tokens: 100, nft: "Pulse Heart" } },
    ],
  },
  {
    num: 6, name: "Lunar Drift", tagline: "Tides of silver across the void.", hue: "300", iconSrc: tileMoon,
    bgGradient: "linear-gradient(135deg, oklch(0.3 0.1 300), oklch(0.16 0.08 280))",
    rareReward: { tokens: 700, nft: "Lunar Sigil" },
    levels: [
      { num: 1, name: "Crescent", moves: 32, size: 7, objective: { kind: "collect", tileId: tile(5), count: 26 }, starThresholds: [4500, 6500, 9000], reward: { tokens: 75, nft: "Crescent Shard" } },
      { num: 2, name: "Moonglide", moves: 30, size: 7, objective: { kind: "score", target: 7500 }, starThresholds: [7500, 10500, 14500], reward: { tokens: 85, nft: "Glide Moon" } },
      { num: 3, name: "Eclipse", moves: 28, size: 7, objective: { kind: "combo", count: 10 }, starThresholds: [7000, 10000, 14000], reward: { tokens: 95, nft: "Eclipse Disc" } },
      { num: 4, name: "Silver Tide", moves: 32, size: 7, objective: { kind: "score", target: 10000 }, starThresholds: [10000, 14000, 19000], reward: { tokens: 110, nft: "Silver Crown" } },
    ],
  },
  {
    num: 7, name: "Ember Wastes", tagline: "Cinders of dead suns.", hue: "30", iconSrc: tileStar,
    bgGradient: "linear-gradient(135deg, oklch(0.32 0.18 30), oklch(0.18 0.12 15))",
    rareReward: { tokens: 800, nft: "Ember Heart" },
    levels: [
      { num: 1, name: "Spark Drift", moves: 32, size: 7, objective: { kind: "score", target: 6000 }, starThresholds: [6000, 8500, 12000], reward: { tokens: 85, nft: "Spark Ember" } },
      { num: 2, name: "Cinder Hunt", moves: 30, size: 7, objective: { kind: "collect", tileId: tile(2), count: 28 }, starThresholds: [5500, 8000, 11500], reward: { tokens: 95, nft: "Cinder Petal" } },
      { num: 3, name: "Pyre Cascade", moves: 28, size: 7, objective: { kind: "combo", count: 11 }, starThresholds: [7500, 10500, 15000], reward: { tokens: 105, nft: "Pyre Mark" } },
      { num: 4, name: "Phoenix Wake", moves: 30, size: 7, objective: { kind: "score", target: 11500 }, starThresholds: [11500, 16000, 22000], reward: { tokens: 120, nft: "Phoenix Crown" } },
    ],
  },
  {
    num: 8, name: "Frost Halo", tagline: "Crystals sing in the cold.", hue: "200", iconSrc: tileOrb,
    bgGradient: "linear-gradient(135deg, oklch(0.3 0.14 200), oklch(0.18 0.1 220))",
    rareReward: { tokens: 900, nft: "Halo Prism" },
    levels: [
      { num: 1, name: "Frost Whisper", moves: 32, size: 7, objective: { kind: "collect", tileId: tile(1), count: 30 }, starThresholds: [6500, 9000, 13000], reward: { tokens: 95, nft: "Whisper Shard" } },
      { num: 2, name: "Ice Aria", moves: 30, size: 7, objective: { kind: "score", target: 9000 }, starThresholds: [9000, 12500, 17000], reward: { tokens: 105, nft: "Aria Crystal" } },
      { num: 3, name: "Glacier Spin", moves: 28, size: 7, objective: { kind: "combo", count: 12 }, starThresholds: [8500, 12000, 17000], reward: { tokens: 115, nft: "Glacier Mark" } },
      { num: 4, name: "Halo Bloom", moves: 32, size: 8, objective: { kind: "score", target: 13000 }, starThresholds: [13000, 18000, 25000], reward: { tokens: 135, nft: "Halo Crown" } },
    ],
  },
  {
    num: 9, name: "Quantum Garden", tagline: "Where physics dreams.", hue: "180", iconSrc: tileGem,
    bgGradient: "linear-gradient(135deg, oklch(0.3 0.18 180), oklch(0.16 0.12 200))",
    rareReward: { tokens: 1100, nft: "Quantum Seed" },
    levels: [
      { num: 1, name: "Wave Function", moves: 32, size: 7, objective: { kind: "score", target: 8000 }, starThresholds: [8000, 11500, 16000], reward: { tokens: 110, nft: "Wave Bead" } },
      { num: 2, name: "Entangle", moves: 30, size: 7, objective: { kind: "combo", count: 13 }, starThresholds: [10000, 14000, 19500], reward: { tokens: 120, nft: "Entangle Ring" } },
      { num: 3, name: "Probability Bloom", moves: 30, size: 7, objective: { kind: "collect", tileId: tile(4), count: 32 }, starThresholds: [9000, 13000, 18000], reward: { tokens: 135, nft: "Bloom Quanta" } },
      { num: 4, name: "Schrödinger's Cascade", moves: 32, size: 8, objective: { kind: "score", target: 15000 }, starThresholds: [15000, 21000, 28000], reward: { tokens: 155, nft: "Cascade Knot" } },
    ],
  },
  {
    num: 10, name: "Singularity", tagline: "All paths converge.", hue: "300", iconSrc: tileCrystal,
    bgGradient: "linear-gradient(135deg, oklch(0.28 0.22 300), oklch(0.13 0.16 280))",
    rareReward: { tokens: 1500, nft: "Singularity Core" },
    levels: [
      { num: 1, name: "Event Horizon", moves: 32, size: 7, objective: { kind: "score", target: 10000 }, starThresholds: [10000, 14000, 19000], reward: { tokens: 130, nft: "Horizon Shard" } },
      { num: 2, name: "Gravity Lens", moves: 30, size: 7, objective: { kind: "collect", tileId: tile(0), count: 34 }, starThresholds: [11000, 15500, 21000], reward: { tokens: 150, nft: "Lens Crystal" } },
      { num: 3, name: "Time Loop", moves: 30, size: 8, objective: { kind: "combo", count: 14 }, starThresholds: [13000, 18000, 25000], reward: { tokens: 175, nft: "Loop Sigil" } },
      { num: 4, name: "Singularity", moves: 34, size: 8, objective: { kind: "score", target: 20000 }, starThresholds: [20000, 28000, 38000], reward: { tokens: 250, nft: "Singularity Crown" } },
    ],
  },
];

export function getChapter(num: number): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.num === num);
}
export function getLevel(chapterNum: number, levelNum: number): { chapter: ChapterDef; level: LevelDef } | undefined {
  const ch = getChapter(chapterNum);
  if (!ch) return undefined;
  const lv = ch.levels.find((l) => l.num === levelNum);
  if (!lv) return undefined;
  return { chapter: ch, level: lv };
}

export function describeObjective(o: Objective): string {
  switch (o.kind) {
    case "score": return `Reach ${o.target.toLocaleString()} pts`;
    case "collect": return `Clear ${o.count} ${TILE_TYPES[o.tileId].name}s`;
    case "combo": return `Trigger a ${o.count}-chain combo`;
  }
}
