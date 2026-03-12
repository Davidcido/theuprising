import { useState, useCallback, useRef, useEffect } from "react";

const STORAGE_KEY = "uprising_audio_prefs";

type AudioPrefs = {
  volume: number;
  muted: boolean;
};

const getStoredPrefs = (): AudioPrefs => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { volume: 0.5, muted: true };
};

const storePrefs = (prefs: AudioPrefs) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
};

export const useAudioPreferences = () => {
  const [prefs, setPrefs] = useState<AudioPrefs>(getStoredPrefs);

  const updatePrefs = useCallback((update: Partial<AudioPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...update };
      storePrefs(next);
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    updatePrefs({ volume: v, muted: v === 0 });
  }, [updatePrefs]);

  const toggleMute = useCallback(() => {
    updatePrefs({ muted: !prefs.muted });
  }, [prefs.muted, updatePrefs]);

  return { volume: prefs.volume, muted: prefs.muted, setVolume, toggleMute };
};

/** Smoothly fade audio volume from current to target over durationMs */
export const fadeAudio = (
  element: HTMLAudioElement | HTMLVideoElement,
  targetVolume: number,
  durationMs: number = 800
) => {
  const startVolume = element.volume;
  const diff = targetVolume - startVolume;
  if (Math.abs(diff) < 0.01) {
    element.volume = targetVolume;
    return;
  }
  const steps = 20;
  const stepMs = durationMs / steps;
  let step = 0;
  const interval = setInterval(() => {
    step++;
    const progress = step / steps;
    // Ease-in-out curve
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    element.volume = Math.max(0, Math.min(1, startVolume + diff * eased));
    if (step >= steps) {
      clearInterval(interval);
      element.volume = Math.max(0, Math.min(1, targetVolume));
    }
  }, stepMs);
  return () => clearInterval(interval);
};
