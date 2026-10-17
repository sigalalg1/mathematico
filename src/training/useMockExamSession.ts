import { useEffect, useState } from 'react';
import type { PlaceValueQuestion } from '../types/placeValue';
import {
  buildMockExamSlots,
  buildQuestionsForSlots,
  computeSkillStats,
  MOCK_EXAM_QUESTION_COUNT,
  type SkillStat,
} from '../utils/decimalExamPrepEngine';

export type MockExamPhase = 'answering' | 'feedback';

export interface MockExamAnswerRecord {
  question: PlaceValueQuestion;
  raw: string;
  correct: boolean;
}

export interface MockExamResult {
  answers: MockExamAnswerRecord[];
  overallCorrect: number;
  overallTotal: number;
  skillStats: SkillStat[];
}

const CORRECT_FEEDBACK_MS = 500;
const WRONG_FEEDBACK_MS = 1400;

/**
 * Drives one run of the mixed, 22-question mock exam. No retry per question
 * (exam conditions: a first answer is the answer) and no per-question skill
 * label — only the final results screen breaks the score down by skill.
 * `examKey` forces a brand new set of slots/questions (a different exam, not
 * the same 22 reshuffled) — the caller re-mounts this hook with a new key to
 * get one.
 */
export function useMockExamSession() {
  const [questions] = useState<PlaceValueQuestion[]>(() => buildQuestionsForSlots(buildMockExamSlots(Math.random), Math.random));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<MockExamPhase>('answering');
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [, setAnswers] = useState<MockExamAnswerRecord[]>([]);
  const [result, setResult] = useState<MockExamResult | null>(null);

  const question = questions[index];

  function submit(raw: string) {
    if (phase !== 'answering') return;
    const correct = question.validate(raw);
    setLastRaw(raw);
    setLastCorrect(correct);
    setPhase('feedback');
    setAnswers((current) => [...current, { question, raw, correct }]);
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
              skillStats: computeSkillStats(current.map((answer) => ({ skillId: answer.question.skillId, correct: answer.correct }))),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lastCorrect]);

  return { question, index, total: MOCK_EXAM_QUESTION_COUNT, phase, lastRaw, lastCorrect, result, submit };
}
