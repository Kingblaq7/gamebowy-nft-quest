import { useEffect } from "react";
import { ChevronRight, Play } from "lucide-react";
import { GamePreview } from "./GamePreview";
import { StarField } from "./StarField";
import { useAudio } from "./audio/AudioProvider";
import cosmicBg from "@/assets/cosmic-bg.jpg";

export function Hero() {
  const { enabled, startAmbience } = useAudio();

  useEffect(() => {
    if (!enabled) return;
    const start = () => {
      startAmbience();
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [enabled, startAmbience]);

  return (
    <section id="play" className="relative min-h-screen overflow-hidden pt-32 pb-20">
      {/* Background layers */}
      <div className="absolute inset-0 -z-10">
        <img
          src={cosmicBg}
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-60"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="absolute inset-0 starfield opacity-70" />
      </div>
      <StarField count={80} />

      {/* Glow halos */}
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-secondary/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-primary/30 blur-[120px]" />

      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[1.1fr,1fr] lg:items-center">
        {/* Copy column */}
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-aurora" />
            </span>
            <span className="text-muted-foreground">Genesis chapter live</span>
          </div>

          <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            Match the
            <br />
            <span className="text-gradient-cosmic">Cosmos</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0">
            Game Bowy is a Web3 match-3 odyssey across ten cosmic chapters.
            Swap, cascade, and collect rare NFT tiles forged in the stars.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start lg:justify-start">
            <a
              href="#play"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-aurora px-7 py-3.5 text-base font-bold text-background transition-transform hover:scale-105 glow-primary"
            >
              <Play className="h-4 w-4 fill-current" />
              Play Demo
            </a>
            <a
              href="#chapters"
              className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-7 py-3.5 text-base font-semibold backdrop-blur transition-colors hover:bg-card/70"
            >
              Explore Chapters
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="mt-12 grid max-w-md grid-cols-3 gap-4 lg:mx-0">
            <Stat value="10" label="Chapters" />
            <Stat value="40" label="Levels" />
            <Stat value="∞" label="NFT Tiles" />
          </div>
        </div>

        {/* Game preview column */}
        <div className="relative">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-aurora opacity-20 blur-3xl" />
          <div className="relative">
            <GamePreview />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Live auto-play preview · cascading match engine
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/30 p-3 text-center backdrop-blur lg:text-left">
      <div className="font-display text-3xl font-black text-gradient-cosmic">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
