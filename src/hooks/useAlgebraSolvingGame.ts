import { useCallback, useMemo, useState } from 'react';
import type { ActivityMistake } from '../types/activity';
import {
  applyOperationToEquation,
  buildSolveChallenges,
  SOLVING_TOTAL,
  stepOptionsFor,
  type LinearOperation,
  type SolveChallenge,
} from '../data/games/algebraSolvingData';
import type { LinearEquation } from '../utils/algebra';

export type SolvePhase = 'choosing' | 'wrong' | 'verifying' | 'completed';

function describeOperation(operation: LinearOperation): string {
  if (operation.kind === 'divide') return `÷${operation.divisor}`;
  const parts: string[] = [];
  if (operation.coefficientDelta !== 0) parts.push(`${operation.coefficientDelta > 0 ? '+' : ''}${operation.coefficientDelta}x`);
  if (operation.constantDelta !== 0) parts.push(`${operation.constantDelta > 0 ? '+' : ''}${operation.constantDelta}`);
  return parts.join(' ');
}

export const ALGEBRA_SOLVING_TOTAL = SOLVING_TOTAL;

/**
 * The step-by-step equation solver: one challenge at a time, each solved by
 * picking the next legal "do it to both sides" move from a small menu rather
 * than typing an answer. A wrong pick never changes the equation — only the
 * correct move (matching the equation's own derived `canonicalPath`) ever
 * advances it, so equality can never appear to break.
 */
export function useAlgebraSolvingGame() {
  const pool = useMemo(() => buildSolveChallenges(), []);
  const [roundKey, setRoundKey] = useState(0);
  const [challenges, setChallenges] = useState<SolveChallenge[]>(pool);
  const [index, setIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [equation, setEquation] = useState<LinearEquation>(pool[0].equation);
  const [phase, setPhase] = useState<SolvePhase>('choosing');
  const [hasWrongAttempt, setHasWrongAttempt] = useState(false);
  const [lastWrongOperation, setLastWrongOperation] = useState<LinearOperation | null>(null);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<ActivityMistake[]>([]);
  const [optionsSeed, setOptionsSeed] = useState(0);

  const challenge = challenges[index];
  const options = useMemo(
    () => stepOptionsFor(challenge, stepIndex),
    // `optionsSeed` forces a fresh (still-valid) shuffle only when re-entering
    // a step after a restart — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenge, stepIndex, optionsSeed],
  );

  const choose = useCallback(
    (operation: LinearOperation) => {
      if (phase !== 'choosing') return;
      const correct = challenge.canonicalPath[stepIndex];
      const isCorrect = JSON.stringify(operation) === JSON.stringify(correct);

      if (!isCorrect) {
        setHasWrongAttempt(true);
        setLastWrongOperation(operation);
        setMistakes((previous) => [
          ...previous,
          { questionId: `${challenge.id}-step${stepIndex}`, selectedAnswer: describeOperation(operation), correctAnswer: describeOperation(correct) },
        ]);
        setPhase('wrong');
        return;
      }

      const next = applyOperationToEquation(equation, operation);
      setEquation(next);
      setLastWrongOperation(null);
      setPhase(stepIndex === challenge.canonicalPath.length - 1 ? 'verifying' : 'choosing');
      if (stepIndex < challenge.canonicalPath.length - 1) setStepIndex((value) => value + 1);
    },
    [phase, challenge, stepIndex, equation],
  );

  const acknowledgeWrong = useCallback(() => {
    setPhase('choosing');
  }, []);

  const next = useCallback(() => {
    if (phase !== 'verifying') return;
    if (!hasWrongAttempt) setFirstAttemptCorrectCount((value) => value + 1);

    if (index === challenges.length - 1) {
      setPhase('completed');
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setStepIndex(0);
    setEquation(challenges[nextIndex].equation);
    setHasWrongAttempt(false);
    setLastWrongOperation(null);
    setPhase('choosing');
  }, [phase, hasWrongAttempt, index, challenges]);

  const retry = useCallback(() => {
    const fresh = buildSolveChallenges();
    setChallenges(fresh);
    setIndex(0);
    setStepIndex(0);
    setEquation(fresh[0].equation);
    setPhase('choosing');
    setHasWrongAttempt(false);
    setLastWrongOperation(null);
    setFirstAttemptCorrectCount(0);
    setMistakes([]);
    setOptionsSeed((value) => value + 1);
    setRoundKey((value) => value + 1);
  }, []);

  return {
    challenge,
    index,
    total: challenges.length,
    stepIndex,
    totalSteps: challenge.canonicalPath.length,
    equation,
    options,
    phase,
    lastWrongOperation,
    hasWrongAttempt,
    firstAttemptCorrectCount,
    mistakes,
    completed: phase === 'completed',
    roundKey,
    choose,
    acknowledgeWrong,
    next,
    retry,
  };
}
