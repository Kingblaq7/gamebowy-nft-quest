import { Lock, Star } from "lucide-react";
import tileCrystal from "@/assets/tile-crystal.png";
import tileOrb from "@/assets/tile-orb.png";
import tileStar from "@/assets/tile-star.png";
import tileCoin from "@/assets/tile-coin.png";
import tileGem from "@/assets/tile-gem.png";
import tileMoon from "@/assets/tile-moon.png";

const CHAPTERS = [
  { num: 1, name: "Genesis Nebula", icon: tileCrystal, hue: "320", unlocked: true, levels: 4, completed: 4 },
  { num: 2, name: "Tide of Orbs", icon: tileOrb, hue: "265", unlocked: true, levels: 4, completed: 3 },
  { num: 3, name: "Stellar Bloom", icon: tileStar, hue: "340", unlocked: true, levels: 4, completed: 1 },
  { num: 4, name: "Forge of Coins", icon: tileCoin, hue: "80", unlocked: false, levels: 4, completed: 0 },
  { num: 5, name: "Verdant Void", icon: tileGem, hue: "150", unlocked: false, levels: 4, completed: 0 },
  { num: 6, name: "Lunar Drift", icon: tileMoon, hue: "300", unlocked: false, levels: 4, completed: 0 },
];

export function ChaptersPreview() {
  return (
    <section id="chapters" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Ten Chapters · Forty Levels
          </span>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-6xl">
            Travel the <span className="text-gradient-cosmic">Bowy Galaxy</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Each chapter unfolds a new region of space with unique NFT artifacts, mechanics, and rewards.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CHAPTERS.map((ch) => (
            <article
              key={ch.num}
              className={`group relative overflow-hidden rounded-3xl glass-card p-6 transition-all duration-500 hover:-translate-y-2 ${
                ch.unlocked ? "" : "opacity-60"
              }`}
              style={{
                boxShadow: ch.unlocked
                  ? `0 20px 60px -20px oklch(0.5 0.25 ${ch.hue} / 0.5)`
                  : undefined,
              }}
            >
              <div
                className="absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
                style={{ background: `oklch(0.65 0.25 ${ch.hue})` }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Chapter {ch.num.toString().padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 font-display text-2xl font-bold">{ch.name}</h3>
                </div>
                <div
                  className="relative h-20 w-20 shrink-0 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
                  style={{ animation: "float 5s ease-in-out infinite" }}
                >
                  <img src={ch.icon} alt={ch.name} className="h-full w-full object-contain drop-shadow-[0_0_20px_currentColor]" style={{ color: `oklch(0.7 0.25 ${ch.hue})` }} />
                </div>
              </div>

              <div className="relative mt-8 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: ch.levels }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-8 rounded-full transition-colors ${
                        i < ch.completed ? "bg-gradient-aurora" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                {ch.unlocked ? (
                  <span className="flex items-center gap-1 text-xs text-stardust">
                    <Star className="h-3 w-3 fill-current" />
                    {ch.completed}/{ch.levels}
                  </span>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          + 4 more chapters unlock as the cosmos expands.
        </p>
      </div>
    </section>
  );
}
