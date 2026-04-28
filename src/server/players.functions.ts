import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-side bounds: theoretical max score per level (very generous).
// Prevents trivial inflation while keeping legitimate play unaffected.
const MAX_SCORE_PER_LEVEL = 100_000;
const MAX_TOKENS_PER_LEVEL = 500;
const MAX_NAME_LEN = 32;

export const ensurePlayer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().regex(UUID_RE),
      display_name: z.string().min(1).max(MAX_NAME_LEN),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("players")
      .select("id, display_name, total_score, gb_tokens")
      .eq("id", data.id)
      .maybeSingle();
    if (existing) return existing;

    const { data: created, error } = await supabaseAdmin
      .from("players")
      .insert({ id: data.id, display_name: data.display_name })
      .select("id, display_name, total_score, gb_tokens")
      .single();
    if (error || !created) {
      return {
        id: data.id,
        display_name: data.display_name,
        total_score: 0,
        gb_tokens: 0,
      };
    }
    return created;
  });

export const updatePlayerName = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().regex(UUID_RE),
      display_name: z.string().trim().min(1).max(MAX_NAME_LEN),
    }).parse,
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("players")
      .update({ display_name: data.display_name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitLevelResult = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      player_id: z.string().regex(UUID_RE),
      chapter: z.number().int().min(1).max(50),
      level: z.number().int().min(1).max(50),
      score: z.number().int().min(0).max(MAX_SCORE_PER_LEVEL),
      stars: z.number().int().min(0).max(3),
      completed: z.boolean(),
      tokens_earned: z.number().int().min(0).max(MAX_TOKENS_PER_LEVEL),
    }).parse,
  )
  .handler(async ({ data }) => {
    // Load existing progress + player atomically (best effort)
    const [{ data: prev }, { data: player }] = await Promise.all([
      supabaseAdmin
        .from("level_progress")
        .select("best_score, stars, completed, plays")
        .eq("player_id", data.player_id)
        .eq("chapter_num", data.chapter)
        .eq("level_num", data.level)
        .maybeSingle(),
      supabaseAdmin
        .from("players")
        .select("id, total_score, gb_tokens")
        .eq("id", data.player_id)
        .maybeSingle(),
    ]);

    if (!player) throw new Error("Player not found");

    const bestScore = Math.max(prev?.best_score ?? 0, data.score);
    const bestStars = Math.max(prev?.stars ?? 0, data.stars);
    const wasCompleted = prev?.completed ?? false;
    const nowCompleted = wasCompleted || data.completed;
    const plays = (prev?.plays ?? 0) + 1;

    await supabaseAdmin.from("level_progress").upsert(
      {
        player_id: data.player_id,
        chapter_num: data.chapter,
        level_num: data.level,
        best_score: bestScore,
        stars: bestStars,
        completed: nowCompleted,
        plays,
        last_played_at: new Date().toISOString(),
      },
      { onConflict: "player_id,chapter_num,level_num" },
    );

    const tokenDelta = wasCompleted
      ? Math.floor(data.tokens_earned / 2)
      : data.tokens_earned;
    const scoreDelta = Math.max(0, data.score - (prev?.best_score ?? 0));
    const newTotal = Number(player.total_score ?? 0) + scoreDelta;
    const newTokens = Number(player.gb_tokens ?? 0) + tokenDelta;

    await supabaseAdmin
      .from("players")
      .update({ total_score: newTotal, gb_tokens: newTokens })
      .eq("id", data.player_id);

    return {
      tokenDelta,
      newBest: bestScore > (prev?.best_score ?? 0),
      firstClear: !wasCompleted && data.completed,
      total_score: newTotal,
      gb_tokens: newTokens,
      best_score: bestScore,
      stars: bestStars,
      completed: nowCompleted,
      plays,
    };
  });
