import { useState } from 'react';
import type { ActivityMistake } from '../types/activity';
import { shuffle } from '../utils/shuffle';

export type ChallengeStatus = 'unanswered' | 'correct' | 'incorrect';

interface UseChallengeRoundConfig<TChallenge, TAnswer> {
  pool: TChallenge[];
  count: number;
  getId: (challenge: TChallenge) => string;
  checkAnswer: (challenge: TChallenge, answer: TAnswer) => boolean;
  formatAnswer: (answer: TAnswer) => string;
  formatCorrectAnswer: (challenge: TChallenge) => string;
  shuffleItem?: (challenge: TChallenge) => TChallenge;
  /** Keep the pool's given order instead of shuffling (e.g. a fixed stage progression). */
  ordered?: boolean;
}

interface UseChallengeRoundResult<TChallenge, TAnswer> {
  challenge: TChallenge;
  index: number;
  total: number;
  status: ChallengeStatus;
  lastAnswer: TAnswer | null;
  hasWrongAttempt: boolean;
  firstAttemptCorrectCount: number;
  mistakes: ActivityMistake[];
  completed: boolean;
  attemptSeed: number;
  roundKey: number;
  submit: (answer: TAnswer) => void;
  next: () => void;
  retry: () => void;
}

function buildRound<T>(pool: T[], count: number, shuffleItem?: (item: T) => T, ordered = false): T[] {
  const base = ordered ? pool : shuffle(pool);
  const selected = base.slice(0, Math.min(count, pool.length));
  return shuffleItem ? selected.map(shuffleItem) : selected;
}

/**
 * Generic one-challenge-at-a-time engine shared by the coordinate games:
 * scoring, retry-in-place on a wrong answer, mistake logging, and
 * completion. Presentation and answer shape are entirely up to the caller.
 */
export function useChallengeRound<TChallenge, TAnswer>({
  pool,
  count,
  getId,
  checkAnswer,
  formatAnswer,
  formatCorrectAnswer,
  shuffleItem,
  ordered = false,
}: UseChallengeRoundConfig<TChallenge, TAnswer>): UseChallengeRoundResult<TChallenge, TAnswer> {
  const [roundKey, setRoundKey] = useState(0);
  const [challenges, setChallenges] = useState<TChallenge[]>(() => buildRound(pool, count, shuffleItem, ordered));
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<ChallengeStatus>('unanswered');
  const [lastAnswer, setLastAnswer] = useState<TAnswer | null>(null);
  const [hasWrongAttempt, setHasWrongAttempt] = useState(false);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<ActivityMistake[]>([]);
  const [attemptSeed, setAttemptSeed] = useState(0);
  const [completed, setCompleted] = useState(false);

  const challenge = challenges[index];

  function submit(answer: TAnswer) {
    if (status === 'correct') return;
    const isCorrect = checkAnswer(challenge, answer);
    setLastAnswer(answer);
    setAttemptSeed((value) => value + 1);

    if (isCorrect) {
      setStatus('correct');
      if (!hasWrongAttempt) setFirstAttemptCorrectCount((value) => value + 1);
    } else {
      setStatus('incorrect');
      setHasWrongAttempt(true);
      setMistakes((value) => [
        ...value,
        { questionId: getId(challenge), selectedAnswer: formatAnswer(answer), correctAnswer: formatCorrectAnswer(challenge) },
      ]);
    }
  }

  function next() {
    if (status === 'unanswered') return;
    setStatus('unanswered');
    setLastAnswer(null);
    setHasWrongAttempt(false);

    if (index === challenges.length - 1) {
      setCompleted(true);
      return;
    }
    setIndex((value) => value + 1);
  }

  function retry() {
    setChallenges(buildRound(pool, count, shuffleItem, ordered));
    setIndex(0);
    setStatus('unanswered');
    setLastAnswer(null);
    setHasWrongAttempt(false);
    setFirstAttemptCorrectCount(0);
    setMistakes([]);
    setAttemptSeed(0);
    setCompleted(false);
    setRoundKey((value) => value + 1);
  }

  return {
    challenge,
    index,
    total: challenges.length,
    status,
    lastAnswer,
    hasWrongAttempt,
    firstAttemptCorrectCount,
    mistakes,
    completed,
    attemptSeed,
    roundKey,
    submit,
    next,
    retry,
  };
}
