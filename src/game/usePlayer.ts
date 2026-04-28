import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ensurePlayer,
  submitLevelResult,
  updatePlayerName,
} from "@/server/players.functions";

const PLAYER_ID_KEY = "gb_player_id";
const PLAYER_NAME_KEY = "gb_player_name";

function genUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randName(): string {
  const adj = ["Cosmic", "Stellar", "Nebula", "Lunar", "Astral", "Quantum", "Solar", "Void"];
  const noun = ["Wanderer", "Drifter", "Voyager", "Pilgrim", "Seeker", "Forge", "Echo", "Spark"];
  return `${adj[Math.floor(Math.random() * adj.length)]} ${noun[Math.floor(Math.random() * noun.length)]}`;
}

export type PlayerProfile = {
  id: string;
  display_name: string;
  total_score: number;
  gb_tokens: number;
};

export type LevelProgressRow = {
  chapter_num: number;
  level_num: number;
  best_score: number;
  stars: number;
  completed: boolean;
  plays: number;
};

export type ProgressMap = Record<string, LevelProgressRow>;

const progressKey = (c: number, l: number) => `${c}-${l}`;

let bootPromise: Promise<PlayerProfile> | null = null;

async function bootstrapPlayer(): Promise<PlayerProfile> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    let id = typeof window !== "undefined" ? localStorage.getItem(PLAYER_ID_KEY) : null;
    let name = typeof window !== "undefined" ? localStorage.getItem(PLAYER_NAME_KEY) : null;
    if (!id) {
      id = genUUID();
      name = randName();
      localStorage.setItem(PLAYER_ID_KEY, id);
      localStorage.setItem(PLAYER_NAME_KEY, name);
    }
    if (!name) {
      name = randName();
      localStorage.setItem(PLAYER_NAME_KEY, name);
    }

    try {
      const profile = await ensurePlayer({ data: { id, display_name: name } });
      return profile as PlayerProfile;
    } catch {
      return { id, display_name: name, total_score: 0, gb_tokens: 0 };
    }
  })();
  return bootPromise;
}

export function usePlayer() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const p = await bootstrapPlayer();
    setProfile(p);
    const { data } = await supabase
      .from("level_progress")
      .select("chapter_num, level_num, best_score, stars, completed, plays")
      .eq("player_id", p.id);
    if (data) {
      const map: ProgressMap = {};
      for (const row of data) map[progressKey(row.chapter_num, row.level_num)] = row as LevelProgressRow;
      setProgress(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitLevel = useCallback(
    async (chapter: number, level: number, score: number, stars: number, completed: boolean, tokensEarned: number) => {
      if (!profile) return;
      const key = progressKey(chapter, level);
      const prev = progress[key];

      // Optimistic UI update
      const optimistic: LevelProgressRow = {
        chapter_num: chapter,
        level_num: level,
        best_score: Math.max(prev?.best_score ?? 0, score),
        stars: Math.max(prev?.stars ?? 0, stars),
        completed: (prev?.completed ?? false) || completed,
        plays: (prev?.plays ?? 0) + 1,
      };
      setProgress((m) => ({ ...m, [key]: optimistic }));

      try {
        const res = await submitLevelResult({
          data: {
            player_id: profile.id,
            chapter,
            level,
            score,
            stars,
            completed,
            tokens_earned: tokensEarned,
          },
        });
        setProfile({ ...profile, total_score: res.total_score, gb_tokens: res.gb_tokens });
        setProgress((m) => ({
          ...m,
          [key]: {
            chapter_num: chapter,
            level_num: level,
            best_score: res.best_score,
            stars: res.stars,
            completed: res.completed,
            plays: res.plays,
          },
        }));
        return { tokenDelta: res.tokenDelta, newBest: res.newBest, firstClear: res.firstClear };
      } catch (e) {
        console.error("submitLevel failed", e);
        return { tokenDelta: 0, newBest: false, firstClear: false };
      }
    },
    [profile, progress]
  );

  const updateName = useCallback(
    async (name: string) => {
      const trimmed = name.trim().slice(0, 32);
      if (!trimmed || !profile) return;
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
      setProfile({ ...profile, display_name: trimmed });
      try {
        await updatePlayerName({ data: { id: profile.id, display_name: trimmed } });
      } catch (e) {
        console.error("updateName failed", e);
      }
    },
    [profile]
  );

  return { profile, progress, loading, refresh, submitLevel, updateName };
}

export function isLevelUnlocked(progress: ProgressMap, chapter: number, level: number): boolean {
  if (chapter === 1 && level === 1) return true;
  if (level > 1) return !!progress[progressKey(chapter, level - 1)]?.completed;
  const prevLast = progress[progressKey(chapter - 1, 4)];
  return !!prevLast?.completed;
}

export function isChapterUnlocked(progress: ProgressMap, chapter: number): boolean {
  if (chapter === 1) return true;
  return !!progress[progressKey(chapter - 1, 4)]?.completed;
}
