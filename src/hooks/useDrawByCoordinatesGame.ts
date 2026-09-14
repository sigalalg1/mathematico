import { useState } from 'react';
import { pickRandomDrawing } from '../data/games/drawByCoordinatesData';
import type { ActivityMistake } from '../types/activity';
import type { DrawingDef, Point } from '../types/drawByCoordinates';

function formatPoint(point: Point): string {
  return `(${point.x}, ${point.y})`;
}

function sameTarget(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

interface UseDrawByCoordinatesGameResult {
  drawing: DrawingDef;
  pointIndex: number;
  total: number;
  target: Point;
  drawnPoints: Point[];
  wrongAttempt: Point | null;
  hasWrongOnCurrent: boolean;
  firstAttemptCorrectCount: number;
  mistakes: ActivityMistake[];
  completed: boolean;
  roundKey: number;
  submit: (point: Point) => void;
  dismissWrongAttempt: () => void;
  nextDrawing: () => void;
}

export function useDrawByCoordinatesGame(): UseDrawByCoordinatesGameResult {
  const [roundKey, setRoundKey] = useState(0);
  const [drawing, setDrawing] = useState<DrawingDef>(() => pickRandomDrawing());
  const [pointIndex, setPointIndex] = useState(0);
  const [drawnPoints, setDrawnPoints] = useState<Point[]>([]);
  const [wrongAttempt, setWrongAttempt] = useState<Point | null>(null);
  const [hasWrongOnCurrent, setHasWrongOnCurrent] = useState(false);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState(0);
  const [mistakes, setMistakes] = useState<ActivityMistake[]>([]);
  const [completed, setCompleted] = useState(false);

  const target = drawing.points[Math.min(pointIndex, drawing.points.length - 1)];

  function submit(point: Point) {
    if (completed) return;
    if (sameTarget(point, target)) {
      setDrawnPoints((prev) => [...prev, target]);
      setWrongAttempt(null);
      if (!hasWrongOnCurrent) setFirstAttemptCorrectCount((value) => value + 1);
      setHasWrongOnCurrent(false);

      if (pointIndex === drawing.points.length - 1) {
        setCompleted(true);
      } else {
        setPointIndex((value) => value + 1);
      }
    } else {
      setWrongAttempt(point);
      setHasWrongOnCurrent(true);
      setMistakes((prev) => [
        ...prev,
        { questionId: `${drawing.id}-${pointIndex}`, selectedAnswer: formatPoint(point), correctAnswer: formatPoint(target) },
      ]);
    }
  }

  function dismissWrongAttempt() {
    setWrongAttempt(null);
  }

  function nextDrawing() {
    setDrawing(pickRandomDrawing(drawing.id));
    setPointIndex(0);
    setDrawnPoints([]);
    setWrongAttempt(null);
    setHasWrongOnCurrent(false);
    setFirstAttemptCorrectCount(0);
    setMistakes([]);
    setCompleted(false);
    setRoundKey((value) => value + 1);
  }

  return {
    drawing,
    pointIndex,
    total: drawing.points.length,
    target,
    drawnPoints,
    wrongAttempt,
    hasWrongOnCurrent,
    firstAttemptCorrectCount,
    mistakes,
    completed,
    roundKey,
    submit,
    dismissWrongAttempt,
    nextDrawing,
  };
}
