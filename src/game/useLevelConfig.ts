import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LevelConfig = {
  base_moves: number;
  combo_bonus: number;
  score_target: number;
};

/**
 * Fetch dynamic level config (moves, combo bonus) from the backend `levels`
 * table. Falls back to provided defaults when the network is slow or the
 * row is missing — gameplay never blocks on this.
 */
export function useLevelConfig(
  chapter: number,
  level: number,
  fallback: LevelConfig
): { config: LevelConfig; ready: boolean } {
  const [config, setConfig] = useState<LevelConfig>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("levels")
          .select("base_moves, combo_bonus, score_target")
          .eq("chapter_num", chapter)
          .eq("level_num", level)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setConfig({
            base_moves: data.base_moves ?? fallback.base_moves,
            combo_bonus: data.combo_bonus ?? fallback.combo_bonus,
            score_target: data.score_target ?? fallback.score_target,
          });
        }
      } catch {
        // keep fallback
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, level]);

  return { config, ready };
}
