import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { SoundControl } from "./audio/SoundControl";
import { PlayButton } from "@/web3/PlayButton";
import { useWallet, shortAddr } from "@/web3/WalletProvider";

export function Navbar() {
  const w = useWallet();
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
          <Link to="/play" className="transition-colors hover:text-foreground">Play</Link>
          <a href="#chapters" className="transition-colors hover:text-foreground">Chapters</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#roadmap" className="transition-colors hover:text-foreground">Roadmap</a>
        </nav>
        <div className="flex items-center gap-3">
          <SoundControl />
          {w.address && (
            <span
              className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs font-mono backdrop-blur sm:inline-flex"
              title={
                w.isAdmin
                  ? "Admin wallet — free access"
                  : w.paid
                  ? "Wallet unlocked"
                  : "Wallet connected"
              }
            >
              {w.isAdmin ? (
                <span aria-label="Admin" className="text-sm leading-none">👑</span>
              ) : (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${w.paid ? "bg-aurora" : "bg-stardust"}`}
                />
              )}
              {shortAddr(w.address)}
            </span>
          )}
          <PlayButton
            to="/play"
            className="rounded-full bg-gradient-aurora px-5 py-2 text-sm font-semibold text-background transition-transform hover:scale-105"
          >
            Play Game
          </PlayButton>
        </div>
      </div>
    </header>
  );
}
