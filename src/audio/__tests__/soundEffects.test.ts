import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playSoundEffect } from '../soundEffects';

/**
 * A minimal fake Web Audio graph that records every oscillator's starting
 * frequency, so we can verify the variant rotation actually varies the pitch
 * without needing a real AudioContext (unavailable in jsdom).
 */
class FakeOscillator {
  type = 'sine';
  frequency = {
    setValueAtTime: vi.fn((freq: number) => {
      capturedFrequencies.push(freq);
    }),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createOscillator() {
    return new FakeOscillator();
  }
  createGain() {
    return new FakeGain();
  }
  resume() {
    return Promise.resolve();
  }
}

let capturedFrequencies: number[] = [];

beforeEach(() => {
  capturedFrequencies = [];
  vi.stubGlobal('AudioContext', FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sound variant rotation', () => {
  it('varies the pitch of a frequently-repeated sound across many plays', () => {
    for (let i = 0; i < 30; i++) playSoundEffect('hit');
    const distinctFirstNotes = new Set(capturedFrequencies.filter((_, i) => i % 3 === 0));
    expect(distinctFirstNotes.size).toBeGreaterThan(1);
  });

  it('never repeats the exact same variant twice in a row', () => {
    const firstNotes: number[] = [];
    for (let i = 0; i < 20; i++) {
      playSoundEffect('miss');
      firstNotes.push(capturedFrequencies[i]);
    }
    for (let i = 1; i < firstNotes.length; i++) {
      expect(firstNotes[i]).not.toBe(firstNotes[i - 1]);
    }
  });

  it('does not vary a sound with no declared variants', () => {
    for (let i = 0; i < 10; i++) playSoundEffect('stageComplete');
    const firstNotes = capturedFrequencies.filter((_, i) => i % 2 === 0);
    expect(new Set(firstNotes).size).toBe(1);
  });
});
