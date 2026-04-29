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
  /** Set the current music track by chapter number (1..10), or null to stop. */
  setTrack: (chapter: number | null) => void;
};

const Ctx = createContext<AudioCtx | null>(null);

export function useAudio() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAudio must be used within AudioProvider");
  return c;
}

type Note = { f: number; d: number };
type Track = { melody: Note[]; bass: Note[] };

// Note frequencies (octaves 3..6)
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98,
};

// 10 chapter tracks. All at 120 BPM, 4/4 feel — different keys/melodies but consistent vibe.
const TRACKS: Record<number, Track> = {
  // 1: Genesis Nebula — bright C major arcade
  1: {
    melody: [
      { f: N.C5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.C6, d: 0.5 },
      { f: N.G5, d: 0.5 }, { f: N.A5, d: 1.0 }, { f: N.G5, d: 0.5 },
      { f: N.E5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.C5, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.F5, d: 0.5 },
      { f: N.G5, d: 1.0 }, { f: N.F5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.D5, d: 1.0 },
      { f: N.C5, d: 1.5 },
    ],
    bass: [
      { f: N.C3, d: 2 }, { f: N.F3, d: 2 }, { f: N.G3, d: 2 },
      { f: N.C3, d: 2 }, { f: N.F3, d: 2 }, { f: N.G3, d: 2 }, { f: N.C3, d: 2 },
    ],
  },
  // 2: Tide of Orbs — flowing A minor
  2: {
    melody: [
      { f: N.A4, d: 0.5 }, { f: N.C5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.A5, d: 0.5 },
      { f: N.G5, d: 0.5 }, { f: N.E5, d: 1.0 }, { f: N.D5, d: 0.5 },
      { f: N.C5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.A4, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.A5, d: 1.0 },
      { f: N.G5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.E5, d: 1.0 }, { f: N.A4, d: 1.5 },
    ],
    bass: [
      { f: N.A3, d: 2 }, { f: N.D3, d: 2 }, { f: N.E3, d: 2 },
      { f: N.A3, d: 2 }, { f: N.F3, d: 2 }, { f: N.G3, d: 2 }, { f: N.A3, d: 2 },
    ],
  },
  // 3: Stellar Bloom — uplifting G major
  3: {
    melody: [
      { f: N.G4, d: 0.5 }, { f: N.B4, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.G5, d: 0.5 },
      { f: N.D5, d: 0.5 }, { f: N.E5, d: 1.0 }, { f: N.D5, d: 0.5 },
      { f: N.B4, d: 0.5 }, { f: N.A4, d: 0.5 }, { f: N.B4, d: 0.5 }, { f: N.G4, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.A5, d: 1.0 },
      { f: N.G5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.D5, d: 1.0 }, { f: N.G4, d: 1.5 },
    ],
    bass: [
      { f: N.G3, d: 2 }, { f: N.C3, d: 2 }, { f: N.D3, d: 2 },
      { f: N.G3, d: 2 }, { f: N.E3, d: 2 }, { f: N.D3, d: 2 }, { f: N.G3, d: 2 },
    ],
  },
  // 4: Forge of Coins — bold D minor pulse
  4: {
    melody: [
      { f: N.D5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.A5, d: 0.5 },
      { f: N.G5, d: 1.0 }, { f: N.F5, d: 0.5 }, { f: N.E5, d: 0.5 },
      { f: N.D5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.D5, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.A4, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.F5, d: 1.0 },
      { f: N.E5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.C5, d: 1.0 }, { f: N.D5, d: 1.5 },
    ],
    bass: [
      { f: N.D3, d: 2 }, { f: N.G3, d: 2 }, { f: N.A3, d: 2 },
      { f: N.D3, d: 2 }, { f: N.F3, d: 2 }, { f: N.A3, d: 2 }, { f: N.D3, d: 2 },
    ],
  },
  // 5: Verdant Void — organic E minor
  5: {
    melody: [
      { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.B5, d: 0.5 }, { f: N.E6, d: 0.5 },
      { f: N.D6, d: 1.0 }, { f: N.B5, d: 0.5 }, { f: N.A5, d: 0.5 },
      { f: N.G5, d: 0.5 }, { f: N.B5, d: 0.5 }, { f: N.A5, d: 0.5 }, { f: N.E5, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.A5, d: 0.5 }, { f: N.B5, d: 1.0 },
      { f: N.A5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.E5, d: 1.0 }, { f: N.E5, d: 1.5 },
    ],
    bass: [
      { f: N.E3, d: 2 }, { f: N.A3, d: 2 }, { f: N.B3, d: 2 },
      { f: N.E3, d: 2 }, { f: N.C3, d: 2 }, { f: N.B3, d: 2 }, { f: N.E3, d: 2 },
    ],
  },
  // 6: Lunar Drift — dreamy F major
  6: {
    melody: [
      { f: N.F4, d: 0.5 }, { f: N.A4, d: 0.5 }, { f: N.C5, d: 0.5 }, { f: N.F5, d: 0.5 },
      { f: N.E5, d: 1.0 }, { f: N.D5, d: 0.5 }, { f: N.C5, d: 0.5 },
      { f: N.A4, d: 0.5 }, { f: N.C5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.F5, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.C5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.A5, d: 1.0 },
      { f: N.G5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.E5, d: 1.0 }, { f: N.F4, d: 1.5 },
    ],
    bass: [
      { f: N.F3, d: 2 }, { f: N.D3, d: 2 }, { f: N.G3, d: 2 },
      { f: N.F3, d: 2 }, { f: N.A3, d: 2 }, { f: N.C3, d: 2 }, { f: N.F3, d: 2 },
    ],
  },
  // 7: Ember Wastes — fierce D minor / Phrygian touch
  7: {
    melody: [
      { f: N.D5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.A5, d: 0.5 },
      { f: N.G5, d: 0.5 }, { f: N.F5, d: 1.0 }, { f: N.E5, d: 0.5 },
      { f: N.D5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.D5, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.A5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.F5, d: 1.0 },
      { f: N.E5, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.C5, d: 1.0 }, { f: N.D5, d: 1.5 },
    ],
    bass: [
      { f: N.D3, d: 2 }, { f: N.A3, d: 2 }, { f: N.G3, d: 2 },
      { f: N.D3, d: 2 }, { f: N.F3, d: 2 }, { f: N.A3, d: 2 }, { f: N.D3, d: 2 },
    ],
  },
  // 8: Frost Halo — crystalline B minor
  8: {
    melody: [
      { f: N.B4, d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.B5, d: 0.5 },
      { f: N.A5, d: 1.0 }, { f: N.G5, d: 0.5 }, { f: N.F5, d: 0.5 },
      { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.B4, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.D5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.A5, d: 1.0 },
      { f: N.G5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.D5, d: 1.0 }, { f: N.B4, d: 1.5 },
    ],
    bass: [
      { f: N.B3, d: 2 }, { f: N.E3, d: 2 }, { f: N.F3, d: 2 },
      { f: N.B3, d: 2 }, { f: N.G3, d: 2 }, { f: N.F3, d: 2 }, { f: N.B3, d: 2 },
    ],
  },
  // 9: Quantum Garden — playful E major
  9: {
    melody: [
      { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.B5, d: 0.5 }, { f: N.E6, d: 0.5 },
      { f: N.B5, d: 0.5 }, { f: N.C6, d: 1.0 }, { f: N.B5, d: 0.5 },
      { f: N.G5, d: 0.5 }, { f: N.F5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.E5, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.B4, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.G5, d: 1.0 },
      { f: N.F5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.D5, d: 1.0 }, { f: N.E5, d: 1.5 },
    ],
    bass: [
      { f: N.E3, d: 2 }, { f: N.A3, d: 2 }, { f: N.B3, d: 2 },
      { f: N.E3, d: 2 }, { f: N.G3, d: 2 }, { f: N.B3, d: 2 }, { f: N.E3, d: 2 },
    ],
  },
  // 10: Singularity — epic finale C minor
  10: {
    melody: [
      { f: N.C5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.C6, d: 0.5 },
      { f: N.B5, d: 1.0 }, { f: N.G5, d: 0.5 }, { f: N.E5, d: 0.5 },
      { f: N.D5, d: 0.5 }, { f: N.E5, d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.C5, d: 1.0 },
      { f: 0,    d: 0.5 }, { f: N.G5, d: 0.5 }, { f: N.C6, d: 0.5 }, { f: N.E6, d: 1.0 },
      { f: N.D6, d: 0.5 }, { f: N.C6, d: 0.5 }, { f: N.B5, d: 1.0 }, { f: N.C5, d: 1.5 },
    ],
    bass: [
      { f: N.C3, d: 2 }, { f: N.G3, d: 2 }, { f: N.A3, d: 2 },
      { f: N.F3, d: 2 }, { f: N.G3, d: 2 }, { f: N.C3, d: 2 }, { f: N.G3, d: 2 },
    ],
  },
};

const BPM = 120;
const BEAT = 60 / BPM;

export function AudioProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [volume, setVolumeState] = useState(0.5);
  const [track, setTrackState] = useState<number | null>(null);

  const acRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const musicPlayingRef = useRef(false);
  const currentTrackRef = useRef<number | null>(null);

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

  // Schedule one pass of the current track at startTime, returns total duration.
  const scheduleLoop = useCallback((ac: AudioContext, dest: AudioNode, startTime: number) => {
    const trackNum = currentTrackRef.current;
    if (trackNum == null) return BEAT; // nothing to play
    const t0 = TRACKS[trackNum] ?? TRACKS[1];

    // Lead melody (square wave — chiptune)
    let t = startTime;
    for (const note of t0.melody) {
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
    for (const note of t0.bass) {
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

  const startAmbience = useCallback(() => {
    if (musicPlayingRef.current) return;
    if (currentTrackRef.current == null) return; // no track selected — silence
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
      while (nextStart < ac2.currentTime + 2) {
        const len = scheduleLoop(ac2, musicGainRef.current, nextStart);
        nextStart += len;
      }
      musicTimerRef.current = window.setTimeout(scheduleAhead, 500);
    };
    scheduleAhead();
  }, [ensureCtx, scheduleLoop]);

  // SFX disabled — melody only
  const playMatch = useCallback(() => { /* disabled */ }, []);
  const playSwap = useCallback(() => { /* disabled */ }, []);
  const playPowerup = useCallback(() => { /* disabled */ }, []);

  const setTrack = useCallback((chapter: number | null) => {
    setTrackState(chapter);
  }, []);

  // React to track / enabled changes
  useEffect(() => {
    // If track changed while playing, restart with the new one
    const desired = enabled ? track : null;
    if (currentTrackRef.current === desired) return;

    // Stop whatever is playing
    if (musicPlayingRef.current) {
      stopAmbience();
    }
    currentTrackRef.current = desired;

    if (desired != null) {
      // Small delay so the previous loop fully fades
      const id = window.setTimeout(() => {
        if (currentTrackRef.current === desired) startAmbience();
      }, 350);
      return () => window.clearTimeout(id);
    }
  }, [track, enabled, startAmbience, stopAmbience]);

  // Resume on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (!enabled || track == null) return;
    const resume = () => {
      const ac = ensureCtx();
      if (ac && !musicPlayingRef.current && currentTrackRef.current != null) startAmbience();
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [enabled, track, ensureCtx, startAmbience]);

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
      value={{ enabled, volume, setEnabled, setVolume, playMatch, playSwap, playPowerup, startAmbience, stopAmbience, setTrack }}
    >
      {children}
    </Ctx.Provider>
  );
}
