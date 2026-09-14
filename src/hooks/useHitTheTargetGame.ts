import { useState } from 'react';
import { buildStageTargets, hitTheTargetStages, HIT_THE_TARGET_TOTAL } from '../data/games/hitTheTargetStages';
import { classifyMistake } from '../data/games/hitTheTargetMistakes';
import type { MistakeType, StageId, TargetPoint } from '../types/hitTheTarget';
import type { ActivityMistake } from '../types/activity';

type FireStatus = 'idle' | 'firing' | 'correct' | 'incorrect';

interface UseHitTheTargetGameResult {
  stageIndex: number;
  stageId: StageId;
  targetIndexInStage: number;
  targetNumber: number;
  target: TargetPoint;
  status: FireStatus;
  attemptMarker: TargetPoint | null;
  mistakeType: MistakeType | null;
  hasWrongAttemptOnCurrent: boolean;
  firstAttemptCorrectCount: number;
  mistakes: ActivityMistake[];
  completed: boolean;
  justEnteredStage: boolean;
  roundKey: number;
  submit: (x: number, y: number) => void;
  advance: () => void;
  retry: () => void;
}

function formatPoint(point: TargetPoint): string {
  return `(${point.x}, ${point.y})`;
}

function buildAllStageTargets(): TargetPoint[][] {
  return hitTheTargetStages.map((stage) => buildStageTargets(stage.id, stage.count));
}

export function useHitTheTargetGame(): UseHitTheTargetGameResult {
  const [roundKey, setRoundKey] = useState(0);
  const [stageTargets, setStageTargets] = useState<TargetPoint[][]>(() => buildAllStageTargets());
  const [stageIndex, setStageIndex] = useState(0);
  const [targetIndexInStage, setTargetIndexInStage] = useState(0);
  const [status, setStatus] = useState<FireStatus>('idle');
  const [attemptMarker, setAttemptMarker] = useState<TargetPoint | null>(null);
  const [mistakeType, setMistakeType] = useState<MistakeType | null>(null);
  const [hasWrongAttemptOnCurrent, setHasWrongAttemptOnCurrent] = useState(false);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<ActivityMistake[]>([]);
  const [completed, setCompleted] = useState(false);
  const [justEnteredStage, setJustEnteredStage] = useState(true);

  const stageId = hitTheTargetStages[stageIndex].id;
  const target = stageTargets[stageIndex][targetIndexInStage];
  const targetNumber = hitTheTargetStages.slice(0, stageIndex).reduce((sum, stage) => sum + stage.count, 0) + targetIndexInStage + 1;

  function submit(x: number, y: number) {
    if (status === 'firing' || status === 'correct') return;
    const attempt: TargetPoint = { x, y };
    const isCorrect = attempt.x === target.x && attempt.y === target.y;

    setStatus('firing');
    window.setTimeout(() => {
      if (isCorrect) {
        setAttemptMarker(null);
        setMistakeType(null);
        setStatus('correct');
        if (!hasWrongAttemptOnCurrent) {
          setFirstAttemptCorrectCount((value) => value + 1);
        }
      } else {
        setAttemptMarker(attempt);
        setMistakeType(classifyMistake(target, attempt));
        setHasWrongAttemptOnCurrent(true);
        setMistakes((value) => [
          ...value,
          { questionId: `${stageId}-${targetIndexInStage}`, selectedAnswer: formatPoint(attempt), correctAnswer: formatPoint(target) },
        ]);
        setStatus('incorrect');
      }
    }, 180);
  }

  function goToNextTarget() {
    setAttemptMarker(null);
    setMistakeType(null);
    setHasWrongAttemptOnCurrent(false);
    setStatus('idle');
    setJustEnteredStage(false);

    const isLastInStage = targetIndexInStage === stageTargets[stageIndex].length - 1;
    if (!isLastInStage) {
      setTargetIndexInStage((value) => value + 1);
      return;
    }

    const isLastStage = stageIndex === hitTheTargetStages.length - 1;
    if (isLastStage) {
      setCompleted(true);
      return;
    }

    setStageIndex((value) => value + 1);
    setTargetIndexInStage(0);
    setJustEnteredStage(true);
  }

  function advance() {
    if (status !== 'correct') return;
    goToNextTarget();
  }

  function retry() {
    setStageTargets(buildAllStageTargets());
    setStageIndex(0);
    setTargetIndexInStage(0);
    setStatus('idle');
    setAttemptMarker(null);
    setMistakeType(null);
    setHasWrongAttemptOnCurrent(false);
    setFirstAttemptCorrectCount(0);
    setMistakes([]);
    setCompleted(false);
    setJustEnteredStage(true);
    setRoundKey((value) => value + 1);
  }

  return {
    stageIndex,
    stageId,
    targetIndexInStage,
    targetNumber,
    target,
    status,
    attemptMarker,
    mistakeType,
    hasWrongAttemptOnCurrent,
    firstAttemptCorrectCount,
    mistakes,
    completed,
    justEnteredStage,
    roundKey,
    submit,
    advance,
    retry,
  };
}

export const HIT_THE_TARGET_TOTAL_COUNT = HIT_THE_TARGET_TOTAL;
