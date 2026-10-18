/**
 * Local-only history for the Decimal Place Value mock exam, used solely to
 * judge readiness ("~85-90% across two different mock exams, no persistent
 * core-skill weakness" — a recommendation, never a grade guarantee). Mirrors
 * `localActivityStore`'s storage conventions (try/catch, capped list), but
 * this unit's per-skill breakdown has no home in the existing Training Mode
 * personal-bests system, so it gets its own small store rather than forcing
 * a shape that does not fit. Supabase sync was deliberately left out of
 * scope — see the unit's final report.
 */
import type { PlaceValueSkillId } from '../types/placeValue';

export interface StoredMockExamResult {
  takenAt: string;
  overallCorrect: number;
  overallTotal: number;
  skillStats: { skillId: PlaceValueSkillId; correct: number; total: number }[];
}

const STORAGE_KEY_PREFIX = 'mathematico-decimal-mockexam-';
const MAX_STORED_RESULTS = 20;

function storageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}${userId ?? 'guest'}`;
}

export function saveMockExamResult(userId: string | null, result: StoredMockExamResult): void {
  try {
    const existing = getMockExamHistory(userId);
    const updated = [result, ...existing].slice(0, MAX_STORED_RESULTS);
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
  } catch {
    // Storage unavailable or full — the result is still shown on screen;
    // only the history used for the readiness read is missing.
  }
}

export function getMockExamHistory(userId: string | null): StoredMockExamResult[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type ReadinessStatus = 'ready' | 'notYet' | 'notEnoughAttempts';

export interface ReadinessAssessment {
  status: ReadinessStatus;
  /** The two most recent attempts considered, most recent first. */
  consideredAttempts: StoredMockExamResult[];
  weakSkillIds: PlaceValueSkillId[];
}

const READINESS_ACCURACY_THRESHOLD = 0.85;
const READINESS_SKILL_ACCURACY_THRESHOLD = 0.6;
const READINESS_SKILL_MIN_SAMPLE = 2;

/**
 * "Ready" means the two most recent mock exams both cleared ~85% overall,
 * and no skill sampled at least twice across them stayed persistently weak.
 * A recommendation to keep practicing, never a promise about the real exam.
 */
export function getReadinessAssessment(userId: string | null): ReadinessAssessment {
  const history = getMockExamHistory(userId);
  const lastTwo = history.slice(0, 2);

  if (lastTwo.length < 2) {
    return { status: 'notEnoughAttempts', consideredAttempts: lastTwo, weakSkillIds: [] };
  }

  const bothHighAccuracy = lastTwo.every((attempt) => attempt.overallTotal > 0 && attempt.overallCorrect / attempt.overallTotal >= READINESS_ACCURACY_THRESHOLD);

  const combinedBySkill = new Map<PlaceValueSkillId, { correct: number; total: number }>();
  for (const attempt of lastTwo) {
    for (const stat of attempt.skillStats) {
      const existing = combinedBySkill.get(stat.skillId) ?? { correct: 0, total: 0 };
      combinedBySkill.set(stat.skillId, { correct: existing.correct + stat.correct, total: existing.total + stat.total });
    }
  }
  const weakSkillIds: PlaceValueSkillId[] = [];
  combinedBySkill.forEach((stat, skillId) => {
    if (stat.total >= READINESS_SKILL_MIN_SAMPLE && stat.correct / stat.total < READINESS_SKILL_ACCURACY_THRESHOLD) {
      weakSkillIds.push(skillId);
    }
  });

  return {
    status: bothHighAccuracy && weakSkillIds.length === 0 ? 'ready' : 'notYet',
    consideredAttempts: lastTwo,
    weakSkillIds,
  };
}
