import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Coins, Pause, RotateCcw, Sparkles, Star, Trophy, X, Zap } from "lucide-react";
import { TILE_TYPES, type LevelDef, type ChapterDef, describeObjective } from "@/game/chapters";
import { useAudio } from "@/components/audio/AudioProvider";
import { usePlayer } from "@/game/usePlayer";
import { useWallet } from "@/web3/WalletProvider";
import { useGbBalance } from "@/game/useGbBalance";

const COMBO_THRESHOLD = 30; // points in single move > this = combo
const COMBO_BONUS_MOVES = 2;
const BUY_COST_GB = 10;
const BUY_MOVES_AMOUNT = 30;

type Cell = { type: number; key: number; matched?: boolean };
type Board = Cell[][];

let keyCounter = 0;
const nextKey = () => ++keyCounter;

function makeCell(pool?: number[]): Cell {
  const types = pool && pool.length > 0 ? pool : TILE_TYPES.map((t) => t.id);
  return { type: types[Math.floor(Math.random() * types.length)], key: nextKey() };
}

function makeBoard(size: number, pool?: number[]): Board {
  const b: Board = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => makeCell(pool))
  );
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      while (
        (c >= 2 && b[r][c].type === b[r][c - 1].type && b[r][c].type === b[r][c - 2].type) ||
        (r >= 2 && b[r][c].type === b[r - 1][c].type && b[r][c].type === b[r - 2][c].type)
      ) {
        b[r][c] = makeCell(pool);
      }
    }
  }
  return b;
}

function findMatches(b: Board): Set<string> {
  const size = b.length;
  const matched = new Set<string>();
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c <= size; c++) {
      if (c < size && b[r][c].type === b[r][c - 1].type) run++;
      else {
        if (run >= 3) for (let k = 0; k < run; k++) matched.add(`${r}-${c - 1 - k}`);
        run = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r <= size; r++) {
      if (r < size && b[r][c].type === b[r - 1][c].type) run++;
      else {
        if (run >= 3) for (let k = 0; k < run; k++) matched.add(`${r - 1 - k}-${c}`);
        run = 1;
      }
    }
  }
  return matched;
}

function hasAnyValidMove(b: Board): boolean {
  const size = b.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size) {
        const t = b.map((row) => row.map((cell) => ({ ...cell })));
        [t[r][c], t[r][c + 1]] = [t[r][c + 1], t[r][c]];
        if (findMatches(t).size > 0) return true;
      }
      if (r + 1 < size) {
        const t = b.map((row) => row.map((cell) => ({ ...cell })));
        [t[r][c], t[r + 1][c]] = [t[r + 1][c], t[r][c]];
        if (findMatches(t).size > 0) return true;
      }
    }
  }
  return false;
}

function collapse(b: Board, pool?: number[]): Board {
  const size = b.length;
  const nb: Board = b.map((row) => row.map((c) => ({ ...c })));
  for (let c = 0; c < size; c++) {
    const col: Cell[] = [];
    for (let r = size - 1; r >= 0; r--) {
      if (!nb[r][c].matched) col.push(nb[r][c]);
    }
    while (col.length < size) col.push(makeCell(pool));
    for (let r = size - 1, i = 0; r >= 0; r--, i++) {
      nb[r][c] = { ...col[i], matched: false };
    }
  }
  return nb;
}

interface Props {
  chapter: ChapterDef;
  level: LevelDef;
}

type GameState = "playing" | "won" | "lost" | "outOfMoves";

export function GameBoard({ chapter, level }: Props) {
  const navigate = useNavigate();
  const { playMatch, playSwap, playPowerup, setTrack } = useAudio();

  // Per-chapter music: start on mount, stop on unmount (no music outside the game)
  useEffect(() => {
    setTrack(chapter.num);
    return () => setTrack(null);
  }, [chapter.num, setTrack]);
  const { submitLevel, profile } = usePlayer();
  const wallet = useWallet();
  const gb = useGbBalance();

  const [board, setBoard] = useState<Board>(() => makeBoard(level.size, level.tilePool));
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(level.moves);
  const [busy, setBusy] = useState(false);
  const [maxCombo, setMaxCombo] = useState(0);
  const [collected, setCollected] = useState<Record<number, number>>({});
  const [state, setState] = useState<GameState>("playing");
  const [lastChain, setLastChain] = useState(0);
  const [paused, setPaused] = useState(false);
  const [comboFlash, setComboFlash] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  // Floating score popups
  const [popups, setPopups] = useState<{ id: number; r: number; c: number; text: string }[]>([]);
  const popupIdRef = useRef(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    r: number; c: number; startX: number; startY: number; cellSize: number;
  } | null>(null);

  // Determine win/lose conditions
  const objectiveProgress = (() => {
    switch (level.objective.kind) {
      case "score": return Math.min(1, score / level.objective.target);
      case "collect": return Math.min(1, (collected[level.objective.tileId] ?? 0) / level.objective.count);
      case "combo": return Math.min(1, maxCombo / level.objective.count);
    }
  })();

  const objectiveMet = objectiveProgress >= 1;

  const computeStars = useCallback(
    (s: number): number => {
      const [a, b, c] = level.starThresholds;
      if (s >= c) return 3;
      if (s >= b) return 2;
      if (s >= a) return 1;
      return 0;
    },
    [level.starThresholds]
  );

  const finishLevel = useCallback(
    async (won: boolean, finalScore: number) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const stars = won ? Math.max(1, computeStars(finalScore)) : computeStars(finalScore);
      const tokens = won ? level.reward.tokens : 0;
      setState(won ? "won" : "lost");
      if (tokens > 0) await gb.add(tokens);
      await submitLevel(chapter.num, level.num, finalScore, stars, won, tokens);
    },
    [chapter.num, level.num, level.reward.tokens, computeStars, submitLevel, gb]
  );

  // After moves run out, decide outcome
  useEffect(() => {
    if (state !== "playing") return;
    if (busy) return;
    if (objectiveMet) {
      void finishLevel(true, score);
    } else if (movesLeft <= 0) {
      // Give the player a chance to buy more moves before finalizing.
      setState("outOfMoves");
    }
  }, [movesLeft, busy, objectiveMet, score, state, finishLevel]);

  const showPopup = useCallback((r: number, c: number, text: string) => {
    const id = ++popupIdRef.current;
    setPopups((p) => [...p, { id, r, c, text }]);
    window.setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  }, []);

  const resolveMatches = useCallback(
    async (current: Board, chain: number): Promise<{ board: Board; gained: number }> => {
      const matches = findMatches(current);
      if (matches.size === 0) {
        return { board: current, gained: 0 };
      }
      // sound
      if (matches.size >= 5 || chain >= 2) playPowerup();
      else playMatch(chain);

      // tally collected by type
      const typeCounts: Record<number, number> = {};
      let centerR = 0, centerC = 0, n = 0;
      for (const k of matches) {
        const [rs, cs] = k.split("-");
        const r = +rs, c = +cs;
        const t = current[r][c].type;
        typeCounts[t] = (typeCounts[t] ?? 0) + 1;
        centerR += r; centerC += c; n++;
      }
      setCollected((prev) => {
        const next = { ...prev };
        for (const [t, count] of Object.entries(typeCounts)) {
          next[+t] = (next[+t] ?? 0) + count;
        }
        return next;
      });

      const gained = matches.size * (10 + chain * 8);
      setScore((s) => s + gained);
      setLastChain(chain + 1);
      setMaxCombo((m) => Math.max(m, chain + 1));
      if (n > 0) showPopup(Math.round(centerR / n), Math.round(centerC / n), `+${gained}`);

      const marked = current.map((row, r) =>
        row.map((cell, c) => ({ ...cell, matched: matches.has(`${r}-${c}`) }))
      );
      setBoard(marked);

      await new Promise((res) => window.setTimeout(res, 380));
      const collapsed = collapse(marked, level.tilePool);
      setBoard(collapsed);
      await new Promise((res) => window.setTimeout(res, 320));

      const next = await resolveMatches(collapsed, chain + 1);
      return { board: next.board, gained: gained + next.gained };
    },
    [playMatch, playPowerup, level.tilePool, showPopup]
  );

  const trySwap = useCallback(
    async (r1: number, c1: number, r2: number, c2: number) => {
      if (busy || state !== "playing" || paused) return;
      const size = board.length;
      if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) return;
      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

      setBusy(true);
      const next = board.map((row) => row.map((c) => ({ ...c })));
      [next[r1][c1], next[r2][c2]] = [next[r2][c2], next[r1][c1]];
      playSwap();
      setBoard(next);
      await new Promise((res) => window.setTimeout(res, 220));

      const matches = findMatches(next);
      if (matches.size === 0) {
        // swap back
        const back = next.map((row) => row.map((c) => ({ ...c })));
        [back[r1][c1], back[r2][c2]] = [back[r2][c2], back[r1][c1]];
        setBoard(back);
        await new Promise((res) => window.setTimeout(res, 220));
        setBusy(false);
        return;
      }

      setLastChain(0);
      const { board: settled, gained } = await resolveMatches(next, 0);

      // Ensure board has moves
      if (!hasAnyValidMove(settled)) {
        await new Promise((res) => window.setTimeout(res, 200));
        const reshuffled = makeBoard(size, level.tilePool);
        setBoard(reshuffled);
      }

      // Combo bonus: if a single move earned more than threshold, refund extra moves
      const isCombo = gained > COMBO_THRESHOLD;
      setMovesLeft((m) => m - 1 + (isCombo ? COMBO_BONUS_MOVES : 0));
      if (isCombo) {
        setComboFlash(`🔥 COMBO! +${COMBO_BONUS_MOVES} Moves`);
        window.setTimeout(() => setComboFlash(null), 1200);
      }
      setBusy(false);
    },
    [board, busy, state, paused, resolveMatches, playSwap, level.tilePool]
  );

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (busy || state !== "playing" || paused) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const cellSize = target.getBoundingClientRect().width;
    dragRef.current = { r, c, startX: e.clientX, startY: e.clientY, cellSize };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const threshold = d.cellSize * 0.4;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    let dr = 0, dc = 0;
    if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
    else dr = dy > 0 ? 1 : -1;
    dragRef.current = null;
    void trySwap(d.r, d.c, d.r + dr, d.c + dc);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Tap-to-swap fallback (select 2 adjacent)
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const onClickCell = (r: number, c: number) => {
    if (busy || state !== "playing" || paused) return;
    if (!selected) {
      setSelected({ r, c });
      return;
    }
    const adj = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
    if (adj) {
      void trySwap(selected.r, selected.c, r, c);
      setSelected(null);
    } else {
      setSelected({ r, c });
    }
  };

  const restart = () => {
    submittedRef.current = false;
    setBoard(makeBoard(level.size, level.tilePool));
    setScore(0);
    setMovesLeft(level.moves);
    setMaxCombo(0);
    setCollected({});
    setState("playing");
    setLastChain(0);
    setPaused(false);
    setSelected(null);
    setBuyError(null);
  };

  const giveUp = useCallback(() => {
    void finishLevel(false, score);
  }, [finishLevel, score]);

  const buyMoves = useCallback(async () => {
    setBuyError(null);
    setBuying(true);
    try {
      const ok = gb.spend(BUY_COST_GB);
      if (!ok) {
        setBuyError(`Not enough GB tokens. You have ${gb.balance} GB.`);
        return;
      }
      setMovesLeft((m) => m + BUY_MOVES_AMOUNT);
      setState("playing");
      setComboFlash(`+${BUY_MOVES_AMOUNT} Moves!`);
      window.setTimeout(() => setComboFlash(null), 1400);
    } catch (e) {
      setBuyError((e as Error).message ?? "Purchase failed");
    } finally {
      setBuying(false);
    }
  }, [gb]);

  const stars = computeStars(score);

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: chapter.bgGradient }}>
      {/* Top HUD */}
      <header className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-background/40 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate({ to: "/play" })}
          className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-card/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Map
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Ch. {chapter.num} · L{level.num}
          </div>
          <div className="font-display text-sm font-bold">{level.name}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-card/40 backdrop-blur"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={restart}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-card/40 backdrop-blur"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Stats bar */}
      <div className="relative z-10 grid grid-cols-3 gap-2 border-b border-white/5 bg-background/30 px-4 py-3 backdrop-blur">
        <Stat label="Score" value={score.toLocaleString()} />
        <Stat label="Moves" value={movesLeft} highlight={movesLeft <= 3} />
        <Stat label="Combo" value={`x${lastChain}`} />
      </div>

      {/* Objective bar */}
      <div className="relative z-10 mx-4 mt-3 rounded-2xl glass-card p-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold">{describeObjective(level.objective)}</span>
          <span className="font-display tabular-nums">
            {level.objective.kind === "score" && `${Math.min(score, level.objective.target).toLocaleString()} / ${level.objective.target.toLocaleString()}`}
            {level.objective.kind === "collect" && `${Math.min(collected[level.objective.tileId] ?? 0, level.objective.count)} / ${level.objective.count}`}
            {level.objective.kind === "combo" && `x${maxCombo} / x${level.objective.count}`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-aurora transition-all duration-500"
            style={{ width: `${objectiveProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Board */}
      <div className="relative flex flex-1 items-center justify-center p-4">
        <div ref={boardRef} className="relative w-full max-w-md">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-aurora opacity-15 blur-3xl" />
          <div className="relative rounded-3xl glass-card p-2.5 glow-primary">
            <div
              className="relative grid aspect-square gap-1.5 select-none"
              style={{ gridTemplateColumns: `repeat(${board.length}, 1fr)` }}
            >
              {board.map((row, r) =>
                row.map((cell, c) => {
                  const t = TILE_TYPES[cell.type];
                  const isSel = selected?.r === r && selected?.c === c;
                  return (
                    <div
                      key={cell.key}
                      onPointerDown={(e) => onPointerDown(e, r, c)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onClick={() => onClickCell(r, c)}
                      className={`relative flex aspect-square cursor-grab touch-none items-center justify-center rounded-xl transition-all duration-200 active:cursor-grabbing ${
                        cell.matched ? "tile-match" : ""
                      } ${isSel ? "ring-2 ring-stardust ring-offset-2 ring-offset-background scale-105 z-10" : ""}`}
                      style={{
                        background: `radial-gradient(circle at 50% 40%, ${t.color}55, transparent 70%)`,
                      }}
                    >
                      <img
                        src={t.src}
                        alt={t.name}
                        className="pointer-events-none h-full w-full object-contain p-1 drop-shadow-[0_0_8px_currentColor]"
                        style={{ color: t.color }}
                        draggable={false}
                      />
                    </div>
                  );
                })
              )}
              {/* Floating popups */}
              {popups.map((p) => (
                <div
                  key={p.id}
                  className="pointer-events-none absolute z-20 font-display text-xl font-black text-stardust"
                  style={{
                    top: `${(p.r / board.length) * 100}%`,
                    left: `${(p.c / board.length) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    animation: "popupFloat 0.9s ease-out forwards",
                    textShadow: "0 0 12px currentColor",
                  }}
                >
                  {p.text}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Drag a tile in any direction to swap
          </p>
        </div>
      </div>

      {/* Combo flash banner */}
      {comboFlash && (
        <div
          className="pointer-events-none absolute left-1/2 top-24 z-40 -translate-x-1/2 rounded-full bg-gradient-aurora px-5 py-2 font-display text-sm font-black text-background shadow-lg"
          style={{ animation: "fade-in 0.2s ease-out" }}
        >
          {comboFlash}
        </div>
      )}

      {/* Out of moves overlay (offer to buy) */}
      {state === "outOfMoves" && (
        <Overlay>
          <Zap className="h-10 w-10 text-stardust" style={{ filter: "drop-shadow(0 0 16px currentColor)" }} />
          <h2 className="font-display text-3xl font-black">Out of Moves</h2>
          <p className="text-center text-sm text-muted-foreground">
            Score: {score.toLocaleString()} · Keep going by buying more moves with GB tokens.
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Balance: <span className="font-bold text-stardust">{gb.balance} GB</span>
          </p>
          <button
            type="button"
            onClick={() => void buyMoves()}
            disabled={buying || gb.balance < BUY_COST_GB}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-aurora px-5 py-3 font-bold text-background disabled:opacity-60"
          >
            <Coins className="h-4 w-4" />
            {buying ? "Processing…" : `Buy ${BUY_MOVES_AMOUNT} Moves (${BUY_COST_GB} GB)`}
          </button>
          {buyError && (
            <p className="text-center text-xs text-destructive">{buyError}</p>
          )}
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={giveUp}
              className="flex-1 rounded-full border border-border/50 bg-card/40 px-4 py-3 text-sm font-semibold backdrop-blur"
            >
              End Run
            </button>
            <button
              type="button"
              onClick={restart}
              className="flex-1 rounded-full border border-border/50 bg-card/40 px-4 py-3 text-sm font-semibold backdrop-blur"
            >
              Restart
            </button>
          </div>
        </Overlay>
      )}

      {/* Pause overlay */}
      {paused && state === "playing" && (
        <Overlay>
          <h2 className="font-display text-3xl font-black">Paused</h2>
          <button
            type="button"
            onClick={() => setPaused(false)}
            className="rounded-full bg-gradient-aurora px-6 py-3 font-bold text-background"
          >
            Resume
          </button>
        </Overlay>
      )}

      {/* Win overlay */}
      {state === "won" && (
        <Overlay>
          <Trophy className="h-12 w-12 text-stardust" style={{ filter: "drop-shadow(0 0 20px currentColor)" }} />
          <div className="text-center">
            <div className="font-display text-xs uppercase tracking-widest text-muted-foreground">Level Complete</div>
            <h2 className="mt-1 font-display text-4xl font-black text-gradient-cosmic">{level.name}</h2>
          </div>
          <StarsRow stars={stars} />
          <div className="grid grid-cols-2 gap-3 text-center">
            <RewardCard label="Score" value={score.toLocaleString()} />
            <RewardCard label="GB Tokens" value={`+${level.reward.tokens}`} accent />
          </div>
          <div className="rounded-2xl glass-card px-4 py-3 text-center">
            <Sparkles className="mx-auto mb-1 h-4 w-4 text-aurora" />
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">NFT Reward</div>
            <div className="font-display font-bold">{level.reward.nft}</div>
          </div>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={restart}
              className="flex-1 rounded-full border border-border/50 bg-card/40 px-4 py-3 font-semibold backdrop-blur"
            >
              Replay
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/play" })}
              className="flex-1 rounded-full bg-gradient-aurora px-4 py-3 font-bold text-background"
            >
              Continue
            </button>
          </div>
          {profile && (
            <p className="text-[10px] text-muted-foreground">
              {profile.display_name} · {profile.gb_tokens} GB
            </p>
          )}
        </Overlay>
      )}

      {/* Lose overlay */}
      {state === "lost" && (
        <Overlay>
          <X className="h-12 w-12 text-destructive" />
          <h2 className="font-display text-3xl font-black">Out of Moves</h2>
          <p className="text-center text-sm text-muted-foreground">
            You scored {score.toLocaleString()} pts. Try again?
          </p>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/play" })}
              className="flex-1 rounded-full border border-border/50 bg-card/40 px-4 py-3 font-semibold"
            >
              Map
            </button>
            <button
              type="button"
              onClick={restart}
              className="flex-1 rounded-full bg-gradient-aurora px-4 py-3 font-bold text-background"
            >
              Retry
            </button>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-2xl border border-border/40 bg-card/40 px-3 py-2 backdrop-blur ${highlight ? "border-destructive/60 text-destructive" : ""}`}>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-bold">{value}</span>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl glass-card p-6 glow-primary"
        style={{ animation: "fade-in 0.4s ease-out, scale-in 0.3s ease-out" }}
      >
        {children}
      </div>
    </div>
  );
}

function StarsRow({ stars }: { stars: number }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`h-10 w-10 transition-all ${n <= stars ? "fill-stardust text-stardust" : "text-muted-foreground/30"}`}
          style={n <= stars ? { filter: "drop-shadow(0 0 12px currentColor)" } : undefined}
        />
      ))}
    </div>
  );
}

function RewardCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border/40 px-3 py-3 ${accent ? "bg-gradient-aurora text-background" : "bg-card/40 backdrop-blur"}`}>
      <div className={`text-[10px] uppercase tracking-widest ${accent ? "text-background/70" : "text-muted-foreground"}`}>{label}</div>
      <div className="font-display text-xl font-black">{value}</div>
    </div>
  );
}
