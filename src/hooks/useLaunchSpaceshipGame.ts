import { useState } from 'react';
import {
  buildStageDestinations,
  launchSpaceshipStages,
  LAUNCH_RANGE_MAX,
  LAUNCH_RANGE_MIN,
  LAUNCH_SPACESHIP_TOTAL,
} from '../data/games/launchSpaceshipStages';
import { classifyMistake } from '../data/games/hitTheTargetMistakes';
import type { TargetPoint, MistakeType } from '../types/hitTheTarget';
import type { FlightStatus, GuidedPhase } from '../types/launchSpaceship';
import type { ActivityMistake } from '../types/activity';

export type HintDirection = 'left' | 'right' | 'up' | 'down';
export interface GuidedHint {
  axis: 'x' | 'y';
  direction: HintDirection;
}

function clamp(value: number): number {
  return Math.min(LAUNCH_RANGE_MAX, Math.max(LAUNCH_RANGE_MIN, value));
}

function resolveInitialPhase(destination: TargetPoint): GuidedPhase {
  if (destination.x === 0) return destination.y === 0 ? 'arrived' : 'y';
  return 'x';
}

function formatPoint(point: TargetPoint): string {
  return `(${point.x}, ${point.y})`;
}

function buildAllStageDestinations(): TargetPoint[][] {
  return launchSpaceshipStages.map((stage) => buildStageDestinations(stage.id, stage.count));
}

interface UseLaunchSpaceshipGameResult {
  stageIndex: number;
  destinationNumber: number;
  destination: TargetPoint;
  mode: 'guided' | 'direct';
  phase: GuidedPhase;
  shipPosition: TargetPoint;
  trail: TargetPoint[];
  hint: GuidedHint | null;
  flightStatus: FlightStatus;
  landingPoint: TargetPoint | null;
  mistakeType: MistakeType | null;
  firstAttemptCorrectCount: number;
  mistakes: ActivityMistake[];
  completed: boolean;
  justEnteredStage: boolean;
  roundKey: number;
  moveX: (direction: 1 | -1) => void;
  moveY: (direction: 1 | -1) => void;
  selectPoint: (point: TargetPoint) => void;
  advance: () => void;
  retry: () => void;
}

export function useLaunchSpaceshipGame(): UseLaunchSpaceshipGameResult {
  const [roundKey, setRoundKey] = useState(0);
  const [stageDestinations, setStageDestinations] = useState<TargetPoint[][]>(() => buildAllStageDestinations());
  const [stageIndex, setStageIndex] = useState(0);
  const [destIndexInStage, setDestIndexInStage] = useState(0);

  const initial = stageDestinations[0][0];
  const [phase, setPhase] = useState<GuidedPhase>(() => resolveInitialPhase(initial));
  const [shipPosition, setShipPosition] = useState<TargetPoint>({ x: 0, y: 0 });
  const [trail, setTrail] = useState<TargetPoint[]>([{ x: 0, y: 0 }]);
  const [hint, setHint] = useState<GuidedHint | null>(null);
  const [wrongStreakX, setWrongStreakX] = useState(0);
  const [wrongStreakY, setWrongStreakY] = useState(0);

  const [flightStatus, setFlightStatus] = useState<FlightStatus>('idle');
  const [landingPoint, setLandingPoint] = useState<TargetPoint | null>(null);
  const [mistakeType, setMistakeType] = useState<MistakeType | null>(null);

  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<ActivityMistake[]>([]);
  const [completed, setCompleted] = useState(false);
  const [justEnteredStage, setJustEnteredStage] = useState(true);

  const stage = launchSpaceshipStages[stageIndex];
  const destination = stageDestinations[stageIndex][destIndexInStage];
  const destinationNumber =
    launchSpaceshipStages.slice(0, stageIndex).reduce((sum, s) => sum + s.count, 0) + destIndexInStage + 1;

  function recordAxisMistake(axis: 'x' | 'y') {
    setMistakes((value) => [
      ...value,
      {
        questionId: `${stage.id}-${destIndexInStage}-${axis}`,
        selectedAnswer: 'wrong-direction',
        correctAnswer: `${axis === 'x' ? 'X' : 'Y'}=${destination[axis]}`,
      },
    ]);
  }

  function moveX(direction: 1 | -1) {
    if (phase !== 'x') return;
    const newX = clamp(shipPosition.x + direction);
    if (newX === shipPosition.x) return;

    const oldDist = Math.abs(shipPosition.x - destination.x);
    const newDist = Math.abs(newX - destination.x);
    const nextPosition = { x: newX, y: shipPosition.y };
    setShipPosition(nextPosition);
    setTrail((value) => [...value, nextPosition]);

    if (newX === destination.x) {
      if (wrongStreakX > 0) {
        setHadWrongAttempt(true);
        recordAxisMistake('x');
      }
      setWrongStreakX(0);
      setHint(null);
      setPhase(destination.y === 0 ? 'arrived' : 'y');
      return;
    }

    if (newDist > oldDist) {
      const streak = wrongStreakX + 1;
      setWrongStreakX(streak);
      if (streak >= 2) {
        setHint({ axis: 'x', direction: destination.x > newX ? 'right' : 'left' });
      }
    } else {
      setWrongStreakX(0);
      setHint(null);
    }
  }

  function moveY(direction: 1 | -1) {
    if (phase !== 'y') return;
    const newY = clamp(shipPosition.y + direction);
    if (newY === shipPosition.y) return;

    const oldDist = Math.abs(shipPosition.y - destination.y);
    const newDist = Math.abs(newY - destination.y);
    const nextPosition = { x: shipPosition.x, y: newY };
    setShipPosition(nextPosition);
    setTrail((value) => [...value, nextPosition]);

    if (newY === destination.y) {
      if (wrongStreakY > 0) {
        setHadWrongAttempt(true);
        recordAxisMistake('y');
      }
      setWrongStreakY(0);
      setHint(null);
      setPhase('arrived');
      return;
    }

    if (newDist > oldDist) {
      const streak = wrongStreakY + 1;
      setWrongStreakY(streak);
      if (streak >= 2) {
        setHint({ axis: 'y', direction: destination.y > newY ? 'up' : 'down' });
      }
    } else {
      setWrongStreakY(0);
      setHint(null);
    }
  }

  function selectPoint(point: TargetPoint) {
    if (flightStatus === 'flying') return;
    setFlightStatus('flying');
    setLandingPoint(null);
    setMistakeType(null);
    setShipPosition(point);

    window.setTimeout(() => {
      const isCorrect = point.x === destination.x && point.y === destination.y;
      if (isCorrect) {
        setFlightStatus('landedCorrect');
        if (!hadWrongAttempt) setFirstAttemptCorrectCount((value) => value + 1);
      } else {
        setLandingPoint(point);
        setMistakeType(classifyMistake(destination, point));
        setHadWrongAttempt(true);
        setMistakes((value) => [
          ...value,
          {
            questionId: `${stage.id}-${destIndexInStage}`,
            selectedAnswer: formatPoint(point),
            correctAnswer: formatPoint(destination),
          },
        ]);
        setFlightStatus('landedIncorrect');
        setShipPosition({ x: 0, y: 0 });
      }
    }, 450);
  }

  function goToNextDestination() {
    if (stage.mode === 'guided' && phase === 'arrived' && !hadWrongAttempt) {
      setFirstAttemptCorrectCount((value) => value + 1);
    }
    setHint(null);
    setLandingPoint(null);
    setMistakeType(null);
    setFlightStatus('idle');
    setHadWrongAttempt(false);
    setWrongStreakX(0);
    setWrongStreakY(0);
    setJustEnteredStage(false);

    const isLastInStage = destIndexInStage === stageDestinations[stageIndex].length - 1;
    const nextStageIndex = isLastInStage ? stageIndex + 1 : stageIndex;
    const nextDestIndex = isLastInStage ? 0 : destIndexInStage + 1;

    if (isLastInStage && stageIndex === launchSpaceshipStages.length - 1) {
      setCompleted(true);
      return;
    }

    const nextDestination = stageDestinations[nextStageIndex][nextDestIndex];
    setStageIndex(nextStageIndex);
    setDestIndexInStage(nextDestIndex);
    setShipPosition({ x: 0, y: 0 });
    setTrail([{ x: 0, y: 0 }]);
    setPhase(resolveInitialPhase(nextDestination));
    if (isLastInStage) setJustEnteredStage(true);
  }

  function advance() {
    if (phase !== 'arrived' && flightStatus !== 'landedCorrect') return;
    goToNextDestination();
  }

  function retry() {
    const fresh = buildAllStageDestinations();
    setStageDestinations(fresh);
    setStageIndex(0);
    setDestIndexInStage(0);
    setShipPosition({ x: 0, y: 0 });
    setTrail([{ x: 0, y: 0 }]);
    setPhase(resolveInitialPhase(fresh[0][0]));
    setHint(null);
    setWrongStreakX(0);
    setWrongStreakY(0);
    setFlightStatus('idle');
    setLandingPoint(null);
    setMistakeType(null);
    setHadWrongAttempt(false);
    setFirstAttemptCorrectCount(0);
    setMistakes([]);
    setCompleted(false);
    setJustEnteredStage(true);
    setRoundKey((value) => value + 1);
  }

  return {
    stageIndex,
    destinationNumber,
    destination,
    mode: stage.mode,
    phase,
    shipPosition,
    trail,
    hint,
    flightStatus,
    landingPoint,
    mistakeType,
    firstAttemptCorrectCount,
    mistakes,
    completed,
    justEnteredStage,
    roundKey,
    moveX,
    moveY,
    selectPoint,
    advance,
    retry,
  };
}

export const LAUNCH_SPACESHIP_TOTAL_COUNT = LAUNCH_SPACESHIP_TOTAL;
