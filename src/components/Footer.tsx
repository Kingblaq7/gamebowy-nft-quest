import { Sparkles, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-border/40 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-aurora">
            <Sparkles className="h-4 w-4 text-background" />
          </div>
          <span className="font-display font-bold">
            GAME <span className="text-gradient-cosmic">BOWY</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://x.com/gamerboyw"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Game Bowy on X (Twitter)"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/50 backdrop-blur transition-colors hover:bg-card/70 hover:text-foreground text-muted-foreground"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://t.me/Gamebowycommunity"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join Game Bowy Telegram community"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/50 backdrop-blur transition-colors hover:bg-card/70 hover:text-foreground text-muted-foreground"
          >
            <Send className="h-4 w-4" />
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Game Bowy · Match the cosmos
        </p>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <a href="#play" className="transition-colors hover:text-foreground">Play</a>
          <a href="#chapters" className="transition-colors hover:text-foreground">Chapters</a>
          <a href="#roadmap" className="transition-colors hover:text-foreground">Roadmap</a>
        </div>
      </div>
    </footer>
  );
}
