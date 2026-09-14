export type SoundName = 'fire' | 'hit' | 'miss' | 'stageComplete' | 'gameComplete' | 'move' | 'phaseChange';

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedContext) {
      const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      sharedContext = new AudioContextClass();
    }
    if (sharedContext.state === 'suspended') {
      void sharedContext.resume();
    }
    return sharedContext;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  freqEnd?: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function tone(ctx: AudioContext, { freq, freqEnd, start, duration, type = 'sine', gain = 0.15 }: ToneOptions): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  if (freqEnd) {
    oscillator.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
  }

  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(gain, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/**
 * Short, synthesized game sounds — no audio assets to load or license.
 * Designed to be reused by any future Mathematico game via playSound(name).
 */
export function playSoundEffect(name: SoundName): void {
  const ctx = getContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    switch (name) {
      case 'fire':
        tone(ctx, { freq: 900, freqEnd: 320, start: now, duration: 0.1, type: 'triangle', gain: 0.11 });
        break;
      case 'hit':
        tone(ctx, { freq: 440, start: now, duration: 0.09, type: 'sine', gain: 0.16 });
        tone(ctx, { freq: 660, start: now + 0.06, duration: 0.14, type: 'sine', gain: 0.15 });
        tone(ctx, { freq: 880, start: now + 0.12, duration: 0.2, type: 'sine', gain: 0.13 });
        break;
      case 'miss':
        tone(ctx, { freq: 220, freqEnd: 150, start: now, duration: 0.2, type: 'sine', gain: 0.07 });
        break;
      case 'stageComplete':
        tone(ctx, { freq: 523.25, start: now, duration: 0.12, type: 'sine', gain: 0.13 });
        tone(ctx, { freq: 659.25, start: now + 0.1, duration: 0.18, type: 'sine', gain: 0.13 });
        break;
      case 'gameComplete':
        tone(ctx, { freq: 523.25, start: now, duration: 0.12, type: 'sine', gain: 0.14 });
        tone(ctx, { freq: 659.25, start: now + 0.1, duration: 0.12, type: 'sine', gain: 0.14 });
        tone(ctx, { freq: 783.99, start: now + 0.2, duration: 0.22, type: 'sine', gain: 0.15 });
        break;
      case 'move':
        tone(ctx, { freq: 520, start: now, duration: 0.05, type: 'square', gain: 0.05 });
        break;
      case 'phaseChange':
        tone(ctx, { freq: 587.33, start: now, duration: 0.08, type: 'sine', gain: 0.12 });
        tone(ctx, { freq: 880, start: now + 0.07, duration: 0.1, type: 'sine', gain: 0.1 });
        break;
    }
  } catch {
    // Sound must never interrupt gameplay.
  }
}
