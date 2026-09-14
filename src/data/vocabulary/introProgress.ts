const STORAGE_KEY = 'mathematico-vocab-intro-seen';

export function hasSeenVocabularyIntro(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markVocabularyIntroSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Ignore storage failures; worst case the intro replays.
  }
}
