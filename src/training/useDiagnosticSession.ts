import { useEffect, useState } from 'react';
import type { PlaceValueQuestion } from '../types/placeValue';
import {
  buildDiagnosticSlots,
  buildQuestionsForSlots,
  computeSkillStats,
  type SkillAnswerRecord,
  type SkillStat,
} from '../utils/decimalExamPrepEngine';

export type DiagnosticPhase = 'answering' | 'feedback';

export interface DiagnosticAnswerRecord extends SkillAnswerRecord {
  questionId: string;
}

export interface DiagnosticResult {
  answers: DiagnosticAnswerRecord[];
  overallCorrect: number;
  overallTotal: number;
  skillStats: SkillStat[];
}

const CORRECT_FEEDBACK_MS = 600;
const WRONG_FEEDBACK_MS = 2200;

/**
 * Drives the 12-question diagnostic: one attempt per question, no retry (a
 * wrong answer corrected on a second try would make the read dishonest),
 * a brief feedback beat, then straight to the next question or the final
 * per-skill breakdown.
 */
export function useDiagnosticSession() {
  const [questions] = useState<PlaceValueQuestion[]>(() => buildQuestionsForSlots(buildDiagnosticSlots(Math.random), Math.random));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<DiagnosticPhase>('answering');
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [, setAnswers] = useState<DiagnosticAnswerRecord[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const question = questions[index];

  function submit(raw: string) {
    if (phase !== 'answering') return;
    const correct = question.validate(raw);
    setLastRaw(raw);
    setLastCorrect(correct);
    setPhase('feedback');
    setAnswers((current) => [...current, { questionId: question.id, skillId: question.skillId, correct }]);
  }

  useEffect(() => {
    if (phase !== 'feedback') return undefined;
    const timer = window.setTimeout(
      () => {
        if (index === questions.length - 1) {
          setAnswers((current) => {
            setResult({
              answers: current,
              overallCorrect: current.filter((answer) => answer.correct).length,
              overallTotal: current.length,
              skillStats: computeSkillStats(current),
            });
            return current;
          });
          return;
        }
        setIndex((value) => value + 1);
        setPhase('answering');
        setLastRaw(null);
        setLastCorrect(null);
      },
      lastCorrect ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS,
    );
    return () => window.clearTimeout(timer);
    // `index`/`questions.length` only matter at the moment the timer fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastCorrect]);

  return { question, index, total: questions.length, phase, lastRaw, lastCorrect, result, submit };
}
