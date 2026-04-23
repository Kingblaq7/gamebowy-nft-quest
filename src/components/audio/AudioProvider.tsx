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

export function AudioProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [volume, setVolumeState] = useState(0.5);

  const acRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const ambienceRef = useRef<{
    nodes: AudioNode[];
    gain: GainNode;
  } | null>(null);

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

  const playMatch = useCallback(
    (chain = 0) => {
      if (!enabled) return;
      const ac = ensureCtx();
      if (!ac || !masterRef.current) return;
      const t = ac.currentTime;
      // Bright pluck, pitch climbs with chain
      const baseFreq = 520 + chain * 110;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, t + 0.18);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(gain).connect(masterRef.current);
      osc.start(t);
      osc.stop(t + 0.34);

      // Sparkle harmonic
      const osc2 = ac.createOscillator();
      const g2 = ac.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(baseFreq * 3, t);
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.12, t + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc2.connect(g2).connect(masterRef.current);
      osc2.start(t);
      osc2.stop(t + 0.24);
    },
    [enabled, ensureCtx]
  );

  const playSwap = useCallback(() => {
    if (!enabled) return;
    const ac = ensureCtx();
    if (!ac || !masterRef.current) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(masterRef.current);
    osc.start(t);
    osc.stop(t + 0.18);
  }, [enabled, ensureCtx]);

  const playPowerup = useCallback(() => {
    if (!enabled) return;
    const ac = ensureCtx();
    if (!ac || !masterRef.current) return;
    const t = ac.currentTime;
    const notes = [440, 660, 880, 1320];
    notes.forEach((f, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      g.gain.setValueAtTime(0, t + i * 0.06);
      g.gain.linearRampToValueAtTime(0.22, t + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.3);
      osc.connect(g).connect(masterRef.current!);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.32);
    });
  }, [enabled, ensureCtx]);

  const startAmbience = useCallback(() => {
    if (!enabled) return;
    if (ambienceRef.current) return;
    const ac = ensureCtx();
    if (!ac || !masterRef.current) return;

    const ambGain = ac.createGain();
    ambGain.gain.value = 0;
    ambGain.connect(masterRef.current);
    ambGain.gain.linearRampToValueAtTime(0.18, ac.currentTime + 1.5);

    // Two slow detuned sines = pad
    const freqs = [110, 165, 220];
    const nodes: AudioNode[] = [ambGain];
    freqs.forEach((f, i) => {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const lfo = ac.createOscillator();
      const lfoGain = ac.createGain();
      lfo.frequency.value = 0.08 + i * 0.05;
      lfoGain.gain.value = 1.5;
      lfo.connect(lfoGain).connect(osc.frequency);
      const filt = ac.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = 800;
      const g = ac.createGain();
      g.gain.value = 0.25;
      osc.connect(filt).connect(g).connect(ambGain);
      osc.start();
      lfo.start();
      nodes.push(osc, lfo, lfoGain, filt, g);
    });

    ambienceRef.current = { nodes, gain: ambGain };
  }, [enabled, ensureCtx]);

  const stopAmbience = useCallback(() => {
    const amb = ambienceRef.current;
    const ac = acRef.current;
    if (!amb || !ac) return;
    const t = ac.currentTime;
    amb.gain.gain.cancelScheduledValues(t);
    amb.gain.gain.linearRampToValueAtTime(0, t + 0.6);
    window.setTimeout(() => {
      amb.nodes.forEach((n) => {
        try {
          if ("stop" in n) (n as OscillatorNode).stop();
          n.disconnect();
        } catch {
          /* noop */
        }
      });
      ambienceRef.current = null;
    }, 700);
  }, []);

  // Stop ambience when disabled
  useEffect(() => {
    if (!enabled) stopAmbience();
  }, [enabled, stopAmbience]);

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
