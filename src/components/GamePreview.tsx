import { useEffect, useRef, useState, useCallback } from "react";
import { useAudio } from "./audio/AudioProvider";
import tileCrystal from "@/assets/tile-crystal.png";
import tileOrb from "@/assets/tile-orb.png";
import tileStar from "@/assets/tile-star.png";
import tileCoin from "@/assets/tile-coin.png";
import tileGem from "@/assets/tile-gem.png";
import tileMoon from "@/assets/tile-moon.png";

const TILE_TYPES = [
  { id: 0, src: tileCrystal, name: "Crystal", color: "oklch(0.72 0.25 320)" },
  { id: 1, src: tileOrb, name: "Orb", color: "oklch(0.65 0.22 265)" },
  { id: 2, src: tileStar, name: "Star", color: "oklch(0.72 0.25 340)" },
  { id: 3, src: tileCoin, name: "Coin", color: "oklch(0.82 0.18 80)" },
  { id: 4, src: tileGem, name: "Gem", color: "oklch(0.7 0.2 150)" },
  { id: 5, src: tileMoon, name: "Moon", color: "oklch(0.85 0.05 300)" },
];

const SIZE = 6;

type Cell = { type: number; key: number; matched?: boolean };
type Board = Cell[][];

let keyCounter = 0;
const nextKey = () => ++keyCounter;

function makeCell(): Cell {
  return { type: Math.floor(Math.random() * TILE_TYPES.length), key: nextKey() };
}

function makeBoard(): Board {
  // generate without immediate matches
  const b: Board = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => makeCell())
  );
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      while (
        (c >= 2 && b[r][c].type === b[r][c - 1].type && b[r][c].type === b[r][c - 2].type) ||
        (r >= 2 && b[r][c].type === b[r - 1][c].type && b[r][c].type === b[r - 2][c].type)
      ) {
        b[r][c] = makeCell();
      }
    }
  }
  return b;
}

function findMatches(b: Board): Set<string> {
  const matched = new Set<string>();
  // horizontal
  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c <= SIZE; c++) {
      if (c < SIZE && b[r][c].type === b[r][c - 1].type) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(`${r}-${c - 1 - k}`);
        }
        run = 1;
      }
    }
  }
  // vertical
  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r <= SIZE; r++) {
      if (r < SIZE && b[r][c].type === b[r - 1][c].type) {
        run++;
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matched.add(`${r - 1 - k}-${c}`);
        }
        run = 1;
      }
    }
  }
  return matched;
}

function findAnyValidSwap(b: Board): [number, number, number, number] | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      // try right
      if (c + 1 < SIZE) {
        const t = JSON.parse(JSON.stringify(b)) as Board;
        [t[r][c], t[r][c + 1]] = [t[r][c + 1], t[r][c]];
        if (findMatches(t).size > 0) return [r, c, r, c + 1];
      }
      // try down
      if (r + 1 < SIZE) {
        const t = JSON.parse(JSON.stringify(b)) as Board;
        [t[r][c], t[r + 1][c]] = [t[r + 1][c], t[r][c]];
        if (findMatches(t).size > 0) return [r, c, r + 1, c];
      }
    }
  }
  return null;
}

function collapse(b: Board): Board {
  const nb: Board = b.map((row) => row.map((c) => ({ ...c })));
  for (let c = 0; c < SIZE; c++) {
    const col: Cell[] = [];
    for (let r = SIZE - 1; r >= 0; r--) {
      if (!nb[r][c].matched) col.push(nb[r][c]);
    }
    while (col.length < SIZE) col.push(makeCell());
    for (let r = SIZE - 1, i = 0; r >= 0; r--, i++) {
      nb[r][c] = { ...col[i], matched: false };
    }
  }
  return nb;
}

export function GamePreview() {
  const [board, setBoard] = useState<Board>(() => makeBoard());
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [moves, setMoves] = useState(20);
  const [swapping, setSwapping] = useState<string[] | null>(null);
  const timeoutRef = useRef<number[]>([]);
  const { playMatch, playSwap, playPowerup } = useAudio();

  const clearTimers = useCallback(() => {
    timeoutRef.current.forEach((t) => window.clearTimeout(t));
    timeoutRef.current = [];
  }, []);

  const tick = useCallback(() => {
    setBoard((current) => {
      const swap = findAnyValidSwap(current);
      if (!swap) {
        return makeBoard();
      }
      const [r1, c1, r2, c2] = swap;
      setSwapping([`${r1}-${c1}`, `${r2}-${c2}`]);
      playSwap();
      const next = current.map((row) => row.map((c) => ({ ...c })));
      [next[r1][c1], next[r2][c2]] = [next[r2][c2], next[r1][c1]];

      timeoutRef.current.push(
        window.setTimeout(() => {
          setSwapping(null);
          resolveMatches(next, 0);
        }, 350)
      );
      return current;
    });
  }, [playSwap]);

  const resolveMatches = useCallback((b: Board, chain: number) => {
    const matches = findMatches(b);
    if (matches.size === 0) {
      setBoard(b);
      setCombo(0);
      timeoutRef.current.push(window.setTimeout(tick, 700));
      return;
    }
    if (matches.size >= 5 || chain >= 2) {
      playPowerup();
    } else {
      playMatch(chain);
    }
    const marked = b.map((row, r) =>
      row.map((cell, c) => ({ ...cell, matched: matches.has(`${r}-${c}`) }))
    );
    setBoard(marked);
    setScore((s) => s + matches.size * (10 + chain * 5));
    setCombo(chain + 1);
    setMoves((m) => (chain === 0 ? Math.max(0, m - 1) : m));

    timeoutRef.current.push(
      window.setTimeout(() => {
        const collapsed = collapse(marked);
        setBoard(collapsed);
        timeoutRef.current.push(
          window.setTimeout(() => resolveMatches(collapsed, chain + 1), 450)
        );
      }, 500)
    );
  }, [tick, playMatch, playPowerup]);

  // refill moves so demo never ends
  useEffect(() => {
    if (moves <= 0) {
      const t = window.setTimeout(() => setMoves(20), 1200);
      return () => window.clearTimeout(t);
    }
  }, [moves]);

  useEffect(() => {
    const start = window.setTimeout(tick, 800);
    return () => {
      window.clearTimeout(start);
      clearTimers();
    };
  }, [tick, clearTimers]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* HUD */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <HudPill label="Score" value={score.toLocaleString()} accent="primary" />
        <HudPill label="Combo" value={`x${combo}`} accent="accent" />
        <HudPill label="Moves" value={moves} accent="secondary" />
      </div>

      {/* Board */}
      <div className="relative rounded-3xl glass-card p-3 glow-primary">
        <div
          className="relative grid aspect-square gap-1.5"
          style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const id = `${r}-${c}`;
              const tile = TILE_TYPES[cell.type];
              const isSwapping = swapping?.includes(id);
              return (
                <div
                  key={cell.key}
                  className={`relative flex aspect-square items-center justify-center rounded-xl transition-all duration-300 ${
                    cell.matched ? "tile-match" : ""
                  } ${isSwapping ? "scale-110 z-10" : ""}`}
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${tile.color}40, transparent 70%)`,
                  }}
                >
                  <img
                    src={tile.src}
                    alt={tile.name}
                    className="h-full w-full object-contain p-1 drop-shadow-[0_0_8px_currentColor]"
                    style={{ color: tile.color }}
                    draggable={false}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Objective bar */}
      <div className="mt-4 flex items-center justify-between rounded-2xl glass-card px-4 py-3 text-xs">
        <span className="text-muted-foreground">Objective</span>
        <span className="font-semibold">Reach 5,000 pts</span>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-aurora transition-all duration-500"
            style={{ width: `${Math.min(100, (score / 5000) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function HudPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "primary" | "secondary" | "accent";
}) {
  const colors = {
    primary: "from-primary/40 to-primary/10",
    secondary: "from-secondary/40 to-secondary/10",
    accent: "from-accent/40 to-accent/10",
  };
  return (
    <div
      className={`flex flex-1 flex-col items-center rounded-2xl border border-border/50 bg-gradient-to-b ${colors[accent]} px-3 py-2 backdrop-blur`}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-lg font-bold">{value}</span>
    </div>
  );
}
