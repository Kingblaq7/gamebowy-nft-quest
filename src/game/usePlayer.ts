import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const PLAYER_ID_KEY = "gb_player_id";
const PLAYER_NAME_KEY = "gb_player_name";

function genUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // RFC4122 v4 fallback
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

export type ProgressMap = Record<string, LevelProgressRow>; // key `${chapter}-${level}`

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

    // Try to fetch existing
    const { data: existing } = await supabase
      .from("players")
      .select("id, display_name, total_score, gb_tokens")
      .eq("id", id)
      .maybeSingle();

    if (existing) return existing as PlayerProfile;

    // Create row
    const { data: created, error } = await supabase
      .from("players")
      .insert({ id, display_name: name })
      .select("id, display_name, total_score, gb_tokens")
      .single();

    if (error || !created) {
      // Network or RLS issue: fall back to local-only profile
      return { id, display_name: name, total_score: 0, gb_tokens: 0 };
    }
    return created as PlayerProfile;
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
      const bestScore = Math.max(prev?.best_score ?? 0, score);
      const bestStars = Math.max(prev?.stars ?? 0, stars);
      const wasCompleted = prev?.completed ?? false;
      const nowCompleted = wasCompleted || completed;
      const plays = (prev?.plays ?? 0) + 1;

      // Optimistic
      const updatedRow: LevelProgressRow = {
        chapter_num: chapter,
        level_num: level,
        best_score: bestScore,
        stars: bestStars,
        completed: nowCompleted,
        plays,
      };
      setProgress((m) => ({ ...m, [key]: updatedRow }));

      // Upsert level progress
      await supabase.from("level_progress").upsert(
        {
          player_id: profile.id,
          chapter_num: chapter,
          level_num: level,
          best_score: bestScore,
          stars: bestStars,
          completed: nowCompleted,
          plays,
          last_played_at: new Date().toISOString(),
        },
        { onConflict: "player_id,chapter_num,level_num" }
      );

      // Add tokens + score (only on first completion award full tokens; else half)
      const tokenDelta = wasCompleted ? Math.floor(tokensEarned / 2) : tokensEarned;
      const newTotal = profile.total_score + Math.max(0, score - (prev?.best_score ?? 0));
      const newTokens = profile.gb_tokens + tokenDelta;
      setProfile({ ...profile, total_score: newTotal, gb_tokens: newTokens });
      await supabase
        .from("players")
        .update({ total_score: newTotal, gb_tokens: newTokens })
        .eq("id", profile.id);

      return { tokenDelta, newBest: bestScore > (prev?.best_score ?? 0), firstClear: !wasCompleted && completed };
    },
    [profile, progress]
  );

  const updateName = useCallback(
    async (name: string) => {
      const trimmed = name.trim().slice(0, 32);
      if (!trimmed || !profile) return;
      localStorage.setItem(PLAYER_NAME_KEY, trimmed);
      setProfile({ ...profile, display_name: trimmed });
      await supabase.from("players").update({ display_name: trimmed }).eq("id", profile.id);
    },
    [profile]
  );

  return { profile, progress, loading, refresh, submitLevel, updateName };
}

export function isLevelUnlocked(progress: ProgressMap, chapter: number, level: number): boolean {
  if (chapter === 1 && level === 1) return true;
  // Previous level same chapter
  if (level > 1) return !!progress[progressKey(chapter, level - 1)]?.completed;
  // Previous chapter's last level
  const prevLast = progress[progressKey(chapter - 1, 4)];
  return !!prevLast?.completed;
}

export function isChapterUnlocked(progress: ProgressMap, chapter: number): boolean {
  if (chapter === 1) return true;
  return !!progress[progressKey(chapter - 1, 4)]?.completed;
}
