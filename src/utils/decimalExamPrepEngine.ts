/**
 * Shared machinery the Diagnostic and Mock Exam both build on: pulling
 * questions from all eight skill generators by id, and turning a list of
 * per-question answers into a per-skill read. Kept separate from any one
 * skill's own data file since neither the diagnostic nor the mock exam
 * belongs to a single skill.
 */
import type { PlaceValueDifficulty, PlaceValueQuestion, PlaceValueSkillId } from '../types/placeValue';
import { PLACE_VALUE_SKILL_IDS } from '../types/placeValue';
import type { RandomSource } from './random';
import { shuffle } from './shuffle';
import { buildPlaceValueQuestions } from '../data/games/decimalPlaceValueData';
import { buildDecompositionQuestions } from '../data/games/decimalDecompositionData';
import { buildOrderingQuestions } from '../data/games/decimalOrderingData';
import { buildRoundingQuestions } from '../data/games/decimalRoundingData';
import { buildArithmeticQuestions } from '../data/games/decimalArithmeticData';
import { buildParityQuestions } from '../data/games/decimalParityData';
import { buildConstraintsQuestions } from '../data/games/decimalConstraintsData';
import { buildWordProblemsQuestions } from '../data/games/decimalWordProblemsData';

type SkillQuestionBuilder = (
  input: { difficultyId: string | null; count: number },
  random: RandomSource,
) => { payload?: PlaceValueQuestion }[];

const SKILL_BUILDERS: Record<PlaceValueSkillId, SkillQuestionBuilder> = {
  placeValue: buildPlaceValueQuestions,
  decomposition: buildDecompositionQuestions,
  ordering: buildOrderingQuestions,
  rounding: buildRoundingQuestions,
  arithmetic: buildArithmeticQuestions,
  parity: buildParityQuestions,
  constraints: buildConstraintsQuestions,
  wordProblems: buildWordProblemsQuestions,
};

/** Maps a skill id to the i18n namespace its own training page already uses, so results screens can name a skill without duplicating its translated name. */
export const SKILL_I18N_PREFIX: Record<PlaceValueSkillId, string> = {
  placeValue: 'decimalPlaceValue',
  decomposition: 'decimalDecomposition',
  ordering: 'decimalOrdering',
  rounding: 'decimalRounding',
  arithmetic: 'decimalArithmetic',
  parity: 'decimalParity',
  constraints: 'decimalConstraints',
  wordProblems: 'decimalWordProblems',
};

/** The route each skill's own Training Mode page lives at, for "practice this skill" links from results screens. */
export const SKILL_PATHS: Record<PlaceValueSkillId, string> = {
  placeValue: '/grade/4/decimal-place-value/place-value-and-conversions',
  decomposition: '/grade/4/decimal-place-value/build-and-break-numbers',
  ordering: '/grade/4/decimal-place-value/comparing-and-sequences',
  rounding: '/grade/4/decimal-place-value/rounding-and-estimation',
  arithmetic: '/grade/4/decimal-place-value/addition-and-subtraction',
  parity: '/grade/4/decimal-place-value/reasoning-without-calculating',
  constraints: '/grade/4/decimal-place-value/missing-numbers-and-puzzles',
  wordProblems: '/grade/4/decimal-place-value/word-problems',
};

export function buildQuestionsForSkill(
  skillId: PlaceValueSkillId,
  difficultyId: PlaceValueDifficulty,
  count: number,
  random: RandomSource,
): PlaceValueQuestion[] {
  return SKILL_BUILDERS[skillId]({ difficultyId, count }, random).map((question) => question.payload!);
}

/** One `(skillId, difficulty)` slot to fill with a single generated question. */
export interface ExamSlot {
  skillId: PlaceValueSkillId;
  difficulty: PlaceValueDifficulty;
}

export function buildQuestionsForSlots(slots: ExamSlot[], random: RandomSource): PlaceValueQuestion[] {
  return slots.map((slot) => buildQuestionsForSkill(slot.skillId, slot.difficulty, 1, random)[0]);
}

export interface SkillAnswerRecord {
  skillId: PlaceValueSkillId;
  correct: boolean;
}

export interface SkillStat {
  skillId: PlaceValueSkillId;
  correct: number;
  total: number;
}

/** Below this many sampled questions, a skill's accuracy is a coin flip, not a read. */
export const SKILL_MIN_CONFIDENT_SAMPLE = 3;
/** Accuracy below this, with enough samples to trust it, counts as a skill to focus on. */
export const SKILL_WEAK_ACCURACY_THRESHOLD = 0.6;

export function computeSkillStats(answers: SkillAnswerRecord[]): SkillStat[] {
  return PLACE_VALUE_SKILL_IDS.map((skillId) => {
    const skillAnswers = answers.filter((answer) => answer.skillId === skillId);
    return { skillId, correct: skillAnswers.filter((answer) => answer.correct).length, total: skillAnswers.length };
  });
}

export type SkillReadStatus = 'strong' | 'weak' | 'insufficientData' | 'noData';

/**
 * `insufficientData` is deliberately distinct from `weak`: a single missed
 * question is a hint worth mentioning, never a confident verdict. Only a
 * skill sampled at least `SKILL_MIN_CONFIDENT_SAMPLE` times can be called
 * "weak" outright.
 */
export function classifySkillStat(stat: SkillStat): SkillReadStatus {
  if (stat.total === 0) return 'noData';
  if (stat.total < SKILL_MIN_CONFIDENT_SAMPLE) return 'insufficientData';
  return stat.correct / stat.total < SKILL_WEAK_ACCURACY_THRESHOLD ? 'weak' : 'strong';
}

/**
 * Builds the 12-question diagnostic's skill/difficulty slots: every skill
 * once at basic, plus four more (one each for four randomly chosen skills)
 * at intermediate — enough to touch every skill while keeping the whole
 * thing short, at the cost of most skills reading as `insufficientData`
 * rather than a confident verdict (an honest tradeoff of a 12-question
 * assessment spanning eight skills, not a bug to paper over).
 */
export function buildDiagnosticSlots(random: RandomSource): ExamSlot[] {
  // All twelve stay at basic difficulty on purpose: the diagnostic is meant
  // to be a quick, low-pressure baseline check (see its own intro copy), not
  // a test of range — an unannounced jump to a harder difficulty partway
  // through would read as a difficulty spike, not a baseline read. The full
  // basic/intermediate/advanced range is the mock exam's job, not this one's.
  const baseline: ExamSlot[] = PLACE_VALUE_SKILL_IDS.map((skillId) => ({ skillId, difficulty: 'basic' as const }));
  const bonusSkills = shuffle([...PLACE_VALUE_SKILL_IDS], random).slice(0, 4);
  const bonus: ExamSlot[] = bonusSkills.map((skillId) => ({ skillId, difficulty: 'basic' as const }));
  return shuffle([...baseline, ...bonus], random);
}

export const MOCK_EXAM_QUESTION_COUNT = 22;

/**
 * Builds one mock exam's skill/difficulty slots: every skill covered at
 * least twice, six skills covered a third time (chosen fresh each call, so
 * regenerating gives a different exam, not the same 22 questions reshuffled),
 * and an overall basic/intermediate/advanced split close to the unit's
 * 20/40/40 foundational/application/reasoning target.
 */
export function buildMockExamSlots(random: RandomSource): ExamSlot[] {
  const skillSlots: PlaceValueSkillId[] = [];
  for (const skillId of PLACE_VALUE_SKILL_IDS) skillSlots.push(skillId, skillId);
  const extraSkills = shuffle([...PLACE_VALUE_SKILL_IDS], random).slice(0, MOCK_EXAM_QUESTION_COUNT - skillSlots.length);
  skillSlots.push(...extraSkills);

  const basicCount = Math.round(MOCK_EXAM_QUESTION_COUNT * 0.2);
  const intermediateCount = Math.round(MOCK_EXAM_QUESTION_COUNT * 0.4);
  const advancedCount = MOCK_EXAM_QUESTION_COUNT - basicCount - intermediateCount;
  const difficulties: PlaceValueDifficulty[] = [
    ...Array<PlaceValueDifficulty>(basicCount).fill('basic'),
    ...Array<PlaceValueDifficulty>(intermediateCount).fill('intermediate'),
    ...Array<PlaceValueDifficulty>(advancedCount).fill('advanced'),
  ];
  const shuffledDifficulties = shuffle(difficulties, random);
  const shuffledSkills = shuffle(skillSlots, random);

  return shuffledSkills.map((skillId, index) => ({ skillId, difficulty: shuffledDifficulties[index] }));
}
