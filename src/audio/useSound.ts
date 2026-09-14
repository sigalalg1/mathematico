import { useCallback, useState } from 'react';
import { playSoundEffect, type SoundName } from './soundEffects';

const STORAGE_KEY = 'mathematico-sound-enabled';

function readPreference(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

interface UseSoundResult {
  enabled: boolean;
  play: (name: SoundName) => void;
  toggle: () => void;
}

/** Reusable sound-preference + playback hook, shared by any game that wants sound effects. */
export function useSound(): UseSoundResult {
  const [enabled, setEnabled] = useState<boolean>(readPreference);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      playSoundEffect(name);
    },
    [enabled],
  );

  const toggle = useCallback(() => {
    setEnabled((previous) => {
      const next = !previous;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage failures; preference just won't persist.
      }
      return next;
    });
  }, []);

  return { enabled, play, toggle };
}
