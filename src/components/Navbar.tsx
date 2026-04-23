import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { SoundControl } from "./audio/SoundControl";

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-aurora glow-primary">
            <Sparkles className="h-5 w-5 text-background" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            GAME <span className="text-gradient-cosmic">BOWY</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#play" className="transition-colors hover:text-foreground">Play</a>
          <a href="#chapters" className="transition-colors hover:text-foreground">Chapters</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#roadmap" className="transition-colors hover:text-foreground">Roadmap</a>
        </nav>
        <div className="flex items-center gap-3">
          <SoundControl />
          <a
            href="#play"
            className="rounded-full bg-gradient-aurora px-5 py-2 text-sm font-semibold text-background transition-transform hover:scale-105"
          >
            Launch Demo
          </a>
        </div>
      </div>
    </header>
  );
}
