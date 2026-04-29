import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAudio } from "./AudioProvider";

export function SoundControl() {
  const { enabled, volume, setEnabled, setVolume, startAmbience, stopAmbience } = useAudio();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (next) {
      startAmbience();
    } else {
      stopAmbience();
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/50 p-1 backdrop-blur">
        <button
          type="button"
          onClick={toggle}
          aria-label={enabled ? "Mute sound" : "Unmute sound"}
          aria-pressed={enabled}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
            enabled
              ? "bg-gradient-aurora text-background glow-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Volume settings"
          aria-expanded={open}
          className="hidden h-9 items-center px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:flex"
        >
          {enabled ? `${Math.round(volume * 100)}%` : "Muted"}
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl glass-card p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
              Cosmic Audio
            </span>
            <button
              type="button"
              onClick={toggle}
              className={`text-xs font-semibold transition-colors ${
                enabled ? "text-aurora" : "text-muted-foreground"
              }`}
            >
              {enabled ? "ON" : "OFF"}
            </button>
          </div>

          <label className="block">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-semibold tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(parseInt(e.target.value, 10) / 100)}
              disabled={!enabled}
              className="cosmic-slider w-full"
              aria-label="Volume"
            />
          </label>

          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            Chiptune gaming melody.
          </p>
        </div>
      )}
    </div>
  );
}
