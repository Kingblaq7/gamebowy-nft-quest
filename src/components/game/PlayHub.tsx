import { Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Star, Trophy } from "lucide-react";
import { CHAPTERS, describeObjective } from "@/game/chapters";
import { isChapterUnlocked, isLevelUnlocked, usePlayer } from "@/game/usePlayer";
import { StarField } from "@/components/StarField";

export function PlayHub() {
  const { profile, progress, loading } = usePlayer();

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background pb-20">
      <StarField count={60} />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-secondary/20 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between gap-3 px-6 py-5">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/40 px-3 py-1.5 text-xs font-semibold backdrop-blur transition-colors hover:bg-card/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        {profile && (
          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-full border border-border/50 bg-card/40 px-3 py-1.5 backdrop-blur">
              <span className="text-muted-foreground">Pilot · </span>
              <span className="font-semibold">{profile.display_name}</span>
            </div>
          </div>
        )}
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-6">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          Choose your chapter
        </span>
        <h1 className="mt-2 font-display text-4xl font-black md:text-5xl">
          The <span className="text-gradient-cosmic">Bowy Galaxy</span>
        </h1>
        {loading && (
          <p className="mt-3 text-sm text-muted-foreground">Syncing your cosmic progress…</p>
        )}
      </section>

      <section className="relative z-10 mx-auto mt-10 grid max-w-5xl gap-6 px-6">
        {CHAPTERS.map((ch) => {
          const unlocked = isChapterUnlocked(progress, ch.num);
          const completedCount = ch.levels.filter(
            (l) => progress[`${ch.num}-${l.num}`]?.completed
          ).length;
          const totalStars = ch.levels.reduce(
            (sum, l) => sum + (progress[`${ch.num}-${l.num}`]?.stars ?? 0),
            0
          );
          return (
            <article
              key={ch.num}
              className={`relative overflow-hidden rounded-3xl glass-card p-6 ${
                unlocked ? "" : "opacity-60"
              }`}
              style={{
                boxShadow: unlocked
                  ? `0 20px 60px -20px oklch(0.5 0.25 ${ch.hue} / 0.5)`
                  : undefined,
              }}
            >
              <div
                className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
                style={{ background: `oklch(0.65 0.25 ${ch.hue})` }}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Chapter {ch.num.toString().padStart(2, "0")}
                  </span>
                  <h2 className="mt-1 font-display text-2xl font-black">{ch.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{ch.tagline}</p>
                </div>
                <div className="relative h-20 w-20 shrink-0">
                  <img
                    src={ch.iconSrc}
                    alt=""
                    className="h-full w-full object-contain drop-shadow-[0_0_20px_currentColor]"
                    style={{ color: `oklch(0.7 0.25 ${ch.hue})`, animation: "float 5s ease-in-out infinite" }}
                  />
                </div>
              </div>

              <div className="relative mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> {completedCount}/{ch.levels.length}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-stardust text-stardust" /> {totalStars}/{ch.levels.length * 3}
                </span>
                <span className="rounded-full border border-border/40 px-2 py-0.5">
                  Rare reward · {ch.rareReward.nft}
                </span>
              </div>

              <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ch.levels.map((lv) => {
                  const key = `${ch.num}-${lv.num}`;
                  const p = progress[key];
                  const lvUnlocked = unlocked && isLevelUnlocked(progress, ch.num, lv.num);
                  return (
                    <Link
                      key={lv.num}
                      to="/play/$chapter/$level"
                      params={{ chapter: String(ch.num), level: String(lv.num) }}
                      disabled={!lvUnlocked}
                      className={`group relative flex flex-col gap-2 rounded-2xl border border-border/40 bg-card/30 p-3 backdrop-blur transition-all ${
                        lvUnlocked
                          ? "hover:-translate-y-1 hover:border-primary/60 hover:bg-card/60"
                          : "pointer-events-none opacity-50"
                      }`}
                      onClick={(e) => {
                        if (!lvUnlocked) e.preventDefault();
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          L{lv.num}
                        </span>
                        {!lvUnlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <div className="font-display text-sm font-bold leading-tight">{lv.name}</div>
                      <div className="text-[10px] leading-snug text-muted-foreground line-clamp-2">
                        {describeObjective(lv.objective)}
                      </div>
                      <div className="mt-auto flex items-center gap-0.5">
                        {[1, 2, 3].map((n) => (
                          <Star
                            key={n}
                            className={`h-3 w-3 ${
                              n <= (p?.stars ?? 0) ? "fill-stardust text-stardust" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
