import { Gamepad2, Gift, Sparkles, Trophy, Wand2, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Gamepad2,
    title: "Match-3 Reimagined",
    desc: "Swap, cascade, and chain combos across a 6×6 cosmic grid with buttery animations.",
  },
  {
    icon: Wand2,
    title: "Power-Up Tiles",
    desc: "Match four for line-clearers, five for board-wipes, T-shapes for nebula bombs.",
  },
  {
    icon: Trophy,
    title: "40 Crafted Levels",
    desc: "Ten chapters of escalating mechanics: blockers, frozen tiles, locked NFTs and more.",
  },
  {
    icon: Sparkles,
    title: "Collectible NFT Tiles",
    desc: "Every level rewards a unique cosmic artifact. Complete chapters for rare drops.",
  },
  {
    icon: Gift,
    title: "Daily Cosmic Rewards",
    desc: "Login streaks, missions, and seasonal events drip GB tokens into your orbit.",
  },
  {
    icon: Zap,
    title: "Boosters & Cascades",
    desc: "Shuffle, extra moves, plasma bombs — earn or summon them when the run gets spicy.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            What's inside
          </span>
          <h2 className="mt-3 font-display text-4xl font-bold md:text-6xl">
            A puzzle game with <span className="text-gradient-cosmic">cosmic depth</span>
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-border/50 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative bg-card/40 p-8 backdrop-blur transition-colors hover:bg-card/70"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-aurora text-background transition-transform group-hover:scale-110 group-hover:rotate-6">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-xl font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
