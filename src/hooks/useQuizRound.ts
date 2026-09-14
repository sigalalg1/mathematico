import { useState } from 'react';
import type { QuizAnswerStatus } from '../types/quiz';
import type { ActivityMistake } from '../types/activity';
import { shuffle } from '../utils/shuffle';

interface UseQuizRoundConfig<T> {
  pool: T[];
  count: number;
  getId: (item: T) => string;
  getCorrectId: (item: T) => string;
  /** Optionally reshuffle parts of a question (e.g. its answer order) for each round. */
  shuffleItem?: (item: T) => T;
}

interface UseQuizRoundResult<T> {
  question: T;
  index: number;
  total: number;
  selectedId: string | null;
  status: QuizAnswerStatus;
  score: number;
  attempt: number;
  completed: boolean;
  mistakes: ActivityMistake[];
  /** Increments every retry; use as a dependency to re-key per-round side effects. */
  roundKey: number;
  select: (id: string) => void;
  next: () => void;
  retry: () => void;
}

function buildRound<T>(pool: T[], count: number, shuffleItem?: (item: T) => T): T[] {
  const selected = shuffle(pool).slice(0, Math.min(count, pool.length));
  return shuffleItem ? selected.map(shuffleItem) : selected;
}

/**
 * Drives a round of one-question-at-a-time multiple-choice-style questions:
 * selection, scoring, progress, and completion. Presentation-agnostic so it
 * can back any question format (text choices, clickable diagrams, etc.).
 */
export function useQuizRound<T>({
  pool,
  count,
  getId,
  getCorrectId,
  shuffleItem,
}: UseQuizRoundConfig<T>): UseQuizRoundResult<T> {
  const [questions, setQuestions] = useState<T[]>(() => buildRound(pool, count, shuffleItem));
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<QuizAnswerStatus>('unanswered');
  const [score, setScore] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [mistakes, setMistakes] = useState<ActivityMistake[]>([]);
  const [roundKey, setRoundKey] = useState(0);

  const question = questions[index];

  function select(id: string) {
    if (status !== 'unanswered') return;
    const correctId = getCorrectId(question);
    const isCorrect = id === correctId;
    setSelectedId(id);
    setStatus(isCorrect ? 'correct' : 'incorrect');
    setAttempt((value) => value + 1);
    if (isCorrect) {
      setScore((value) => value + 1);
    } else {
      setMistakes((value) => [
        ...value,
        { questionId: getId(question), selectedAnswer: id, correctAnswer: correctId },
      ]);
    }
  }

  function next() {
    if (index === questions.length - 1) {
      setCompleted(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelectedId(null);
    setStatus('unanswered');
  }

  function retry() {
    setQuestions(buildRound(pool, count, shuffleItem));
    setIndex(0);
    setSelectedId(null);
    setStatus('unanswered');
    setScore(0);
    setAttempt(0);
    setCompleted(false);
    setMistakes([]);
    setRoundKey((value) => value + 1);
  }

  return {
    question,
    index,
    total: questions.length,
    selectedId,
    status,
    score,
    attempt,
    completed,
    mistakes,
    roundKey,
    select,
    next,
    retry,
  };
}

export type { UseQuizRoundConfig, UseQuizRoundResult };
