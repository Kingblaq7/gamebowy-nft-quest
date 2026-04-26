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
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Game Bowy · Match the cosmos
        </p>
        <div className="flex items-center gap-3">
          <a
            href="https://t.me/Gamebowycommunity"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram community"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-card/40 text-muted-foreground backdrop-blur transition-colors hover:bg-card/70 hover:text-foreground"
          >
            <Send className="h-4 w-4" />
          </a>
          <a
            href="https://x.com/gamerboyw"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow on X"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-card/40 text-muted-foreground backdrop-blur transition-colors hover:bg-card/70 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M18.244 2H21l-6.51 7.44L22 22h-6.797l-5.32-6.957L3.8 22H1.04l6.96-7.954L1.5 2h6.93l4.81 6.36L18.244 2Zm-1.193 18.4h1.882L7.04 3.5H5.034L17.05 20.4Z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
