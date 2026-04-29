import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type AudioCtx = {
  enabled: boolean;
  volume: number; // 0..1
  setEnabled: (v: boolean) => void;
  setVolume: (v: number) => void;
  playMatch: (chain?: number) => void;
  playSwap: () => void;
  playPowerup: () => void;
  startAmbience: () => void;
  stopAmbience: () => void;
};

const Ctx = createContext<AudioCtx | null>(null);

export function useAudio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAudio must be used within AudioProvider");
  return c;
}

// 8-bit style gaming melody (notes in Hz, duration in beats). Loops seamlessly.
// Upbeat arcade tune in C major.
const MELODY: Array<{ f: number; d: number }> = [
  { f: 523.25, d: 0.5 }, // C5
  { f: 659.25, d: 0.5 }, // E5
  { f: 783.99, d: 0.5 }, // G5
  { f: 1046.5, d: 0.5 }, // C6
  { f: 783.99, d: 0.5 }, // G5
  { f: 880.0, d: 1.0 },  // A5
  { f: 783.99, d: 0.5 }, // G5
  { f: 659.25, d: 0.5 }, // E5
  { f: 587.33, d: 0.5 }, // D5
  { f: 659.25, d: 0.5 }, // E5
  { f: 523.25, d: 1.0 }, // C5
  { f: 0,      d: 0.5 }, // rest
  { f: 587.33, d: 0.5 }, // D5
  { f: 659.25, d: 0.5 }, // E5
  { f: 698.46, d: 0.5 }, // F5
  { f: 783.99, d: 1.0 }, // G5
  { f: 698.46, d: 0.5 }, // F5
  { f: 659.25, d: 0.5 }, // E5
  { f: 587.33, d: 1.0 }, // D5
  { f: 523.25, d: 1.5 }, // C5
];

// Simple bass line (root notes)
const BASS: Array<{ f: number; d: number }> = [
  { f: 130.81, d: 2.0 }, // C3
  { f: 174.61, d: 2.0 }, // F3
  { f: 196.0,  d: 2.0 }, // G3
  { f: 130.81, d: 2.0 }, // C3
  { f: 174.61, d: 2.0 }, // F3
  { f: 196.0,  d: 2.0 }, // G3
  { f: 130.81, d: 2.0 }, // C3
];

const BPM = 120;
const BEAT = 60 / BPM;

export function AudioProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [volume, setVolumeState] = useState(0.5);

  const acRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const musicPlayingRef = useRef(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const e = localStorage.getItem("gb_audio_enabled");
      const v = localStorage.getItem("gb_audio_volume");
      if (e !== null) setEnabledState(e === "1");
      if (v !== null) setVolumeState(Math.max(0, Math.min(1, parseFloat(v))));
    } catch {
      /* noop */
    }
  }, []);

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!acRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      const ac = new AC();
      const master = ac.createGain();
      master.gain.value = enabled ? volume : 0;
      master.connect(ac.destination);
      acRef.current = ac;
      masterRef.current = master;
    }
    if (acRef.current.state === "suspended") {
      void acRef.current.resume();
    }
    return acRef.current;
  }, [enabled, volume]);

  // Update master gain when state changes
  useEffect(() => {
    try {
      localStorage.setItem("gb_audio_enabled", enabled ? "1" : "0");
      localStorage.setItem("gb_audio_volume", String(volume));
    } catch {
      /* noop */
    }
    if (masterRef.current && acRef.current) {
      const target = enabled ? volume : 0;
      masterRef.current.gain.cancelScheduledValues(acRef.current.currentTime);
      masterRef.current.gain.linearRampToValueAtTime(target, acRef.current.currentTime + 0.08);
    }
  }, [enabled, volume]);

  // Schedule one pass of the melody+bass starting at startTime, returns total duration.
  const scheduleLoop = useCallback((ac: AudioContext, dest: AudioNode, startTime: number) => {
    // Lead melody (square wave — chiptune)
    let t = startTime;
    for (const note of MELODY) {
      const dur = note.d * BEAT;
      if (note.f > 0) {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(note.f, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.02);
        g.gain.setValueAtTime(0.18, t + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
        osc.connect(g).connect(dest);
        osc.start(t);
        osc.stop(t + dur);
      }
      t += dur;
    }
    const melodyEnd = t;

    // Bass line (triangle wave)
    let bt = startTime;
    for (const note of BASS) {
      const dur = note.d * BEAT;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, bt);
      g.gain.setValueAtTime(0, bt);
      g.gain.linearRampToValueAtTime(0.22, bt + 0.03);
      g.gain.setValueAtTime(0.22, bt + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, bt + dur * 0.98);
      osc.connect(g).connect(dest);
      osc.start(bt);
      osc.stop(bt + dur);
      bt += dur;
    }

    return Math.max(melodyEnd, bt) - startTime;
  }, []);

  const startAmbience = useCallback(() => {
    if (musicPlayingRef.current) return;
    const ac = ensureCtx();
    if (!ac || !masterRef.current) return;

    const musicGain = ac.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(masterRef.current);
    musicGainRef.current = musicGain;
    musicPlayingRef.current = true;

    let nextStart = ac.currentTime + 0.1;
    const scheduleAhead = () => {
      if (!musicPlayingRef.current || !acRef.current || !musicGainRef.current) return;
      const ac2 = acRef.current;
      // Schedule loops up to ~2s ahead
      while (nextStart < ac2.currentTime + 2) {
        const len = scheduleLoop(ac2, musicGainRef.current, nextStart);
        nextStart += len;
      }
      musicTimerRef.current = window.setTimeout(scheduleAhead, 500);
    };
    scheduleAhead();
  }, [ensureCtx, scheduleLoop]);

  const stopAmbience = useCallback(() => {
    musicPlayingRef.current = false;
    if (musicTimerRef.current !== null) {
      window.clearTimeout(musicTimerRef.current);
      musicTimerRef.current = null;
    }
    const g = musicGainRef.current;
    const ac = acRef.current;
    if (g && ac) {
      const t = ac.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.linearRampToValueAtTime(0, t + 0.3);
      window.setTimeout(() => {
        try {
          g.disconnect();
        } catch {
          /* noop */
        }
        musicGainRef.current = null;
      }, 400);
    }
  }, []);

  // Match/swap/powerup SFX disabled — only the melody plays.
  const playMatch = useCallback(() => {
    /* disabled — melody only */
  }, []);
  const playSwap = useCallback(() => {
    /* disabled */
  }, []);
  const playPowerup = useCallback(() => {
    /* disabled */
  }, []);

  // Auto-start melody when enabled, stop when disabled.
  useEffect(() => {
    if (enabled) {
      // Try to start; if AudioContext is suspended (no user gesture yet),
      // it will resume on first interaction via ensureCtx.
      startAmbience();
    } else {
      stopAmbience();
    }
  }, [enabled, startAmbience, stopAmbience]);

  // Resume on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      const ac = ensureCtx();
      if (ac && !musicPlayingRef.current) startAmbience();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [enabled, ensureCtx, startAmbience]);

  const setEnabled = useCallback(
    (v: boolean) => {
      setEnabledState(v);
      if (v) ensureCtx();
    },
    [ensureCtx]
  );
  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), []);

  return (
    <Ctx.Provider
      value={{ enabled, volume, setEnabled, setVolume, playMatch, playSwap, playPowerup, startAmbience, stopAmbience }}
    >
      {children}
    </Ctx.Provider>
  );
}
