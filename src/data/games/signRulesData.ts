import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import type {
  SignRuleDifficulty,
  SignRuleFamily,
  SignRuleMistake,
  SignRuleOperator,
  SignRuleQuestionPayload,
  SignRuleQuestionType,
} from '../../types/signRules';
import { randomInt, seededRandom, type RandomSource } from '../../utils/random';
import { shuffle } from '../../utils/shuffle';
import { formatSigned, formatTerm } from '../../utils/signedNumbers';

export const SIGN_RULES_ID = 'signRules';
export const SIGN_RULES_RULES_VERSION = 2;
export const SIGN_RULES_CHOICES = 4;

const FAMILIES: SignRuleFamily[] = ['posPos', 'negPos', 'posNeg', 'negNeg'];

function difficultyOf(value: string | null): SignRuleDifficulty {
  return value === 'intermediate' || value === 'hard' ? value : 'basic';
}

export function familyOf(left: number, right: number): SignRuleFamily {
  return `${left < 0 ? 'neg' : 'pos'}${right < 0 ? 'Neg' : 'Pos'}` as SignRuleFamily;
}

function signsFor(family: SignRuleFamily): [number, number] {
  return [
    family === 'negPos' || family === 'negNeg' ? -1 : 1,
    family === 'posNeg' || family === 'negNeg' ? -1 : 1,
  ];
}

export function applyOperation(left: number, operator: SignRuleOperator, right: number): number {
  if (operator === '÷' && right === 0) throw new Error('sign rules: divisor cannot be zero');
  return operator === '×' ? left * right : left / right;
}

function expression(left: number, operator: SignRuleOperator, right: number): string {
  return `${formatTerm(left)} ${operator} ${formatTerm(right)}`;
}

function signedAdd(intermediate: number, addend: number): string {
  return `${formatSigned(intermediate)} ${addend < 0 ? '−' : '+'} ${Math.abs(addend)}`;
}

function typeFor(difficulty: SignRuleDifficulty, index: number, random: RandomSource): SignRuleQuestionType {
  if (difficulty === 'basic') return index < 2 ? 'signFirst' : 'multiply';
  if (difficulty === 'intermediate') {
    return (['multiply', 'inverseDivision', 'divide', 'signOnly', 'mixed'] as const)[index % 5];
  }
  return (['mixed', 'signOnly', 'expression', 'divide', 'multiply'] as const)[index % 5];
}

function numericDistractors(payload: SignRuleQuestionPayload): number[] {
  const { left, right, result } = payload;
  const sign = result < 0 ? -1 : 1;
  const additionSlip = sign * (Math.abs(left) + Math.abs(right));
  const candidates = [
    result === 0 ? Math.abs(left || right) : -result,
    additionSlip,
    result + 1,
    result - 1,
    result + sign * Math.max(2, Math.abs(right)),
    result - sign * Math.max(2, Math.abs(left)),
  ];
  const chosen: number[] = [];
  const used = new Set([result]);
  for (const candidate of candidates) {
    if (!Number.isInteger(candidate) || used.has(candidate)) continue;
    used.add(candidate);
    chosen.push(candidate);
    if (chosen.length === SIGN_RULES_CHOICES - 1) return chosen;
  }
  for (let offset = 2; chosen.length < SIGN_RULES_CHOICES - 1; offset += 1) {
    for (const candidate of [result + offset, result - offset]) {
      if (used.has(candidate)) continue;
      used.add(candidate);
      chosen.push(candidate);
      if (chosen.length === SIGN_RULES_CHOICES - 1) break;
    }
  }
  return chosen;
}

function buildPayload(
  difficulty: SignRuleDifficulty,
  type: SignRuleQuestionType,
  family: SignRuleFamily,
  random: RandomSource,
  forceZero: boolean,
): SignRuleQuestionPayload {
  const maxFactor = difficulty === 'basic' ? 9 : difficulty === 'intermediate' ? 12 : 15;
  const minFactor = difficulty === 'hard' && type === 'signOnly' ? 11 : 2;
  const [leftSign, rightSign] = signsFor(family);
  let left = leftSign * randomInt(random, minFactor, maxFactor);
  let right = rightSign * randomInt(random, 2, difficulty === 'basic' ? 9 : 12);
  let operator: SignRuleOperator = '×';

  if (forceZero) left = 0;
  if (type === 'divide' || type === 'inverseDivision' || (type === 'mixed' && random() < 0.5)) {
    operator = '÷';
    const quotient = forceZero ? 0 : leftSign * rightSign * randomInt(random, minFactor, maxFactor);
    const divisor = rightSign * randomInt(random, 2, difficulty === 'hard' ? 12 : 10);
    left = quotient * divisor;
    right = divisor;
  }

  const intermediate = applyOperation(left, operator, right);
  if (!Number.isInteger(intermediate)) throw new Error('sign rules: generated a non-integer result');
  const addend =
    type === 'expression'
      ? (random() < 0.5 ? -1 : 1) * randomInt(random, 2, difficulty === 'hard' ? 12 : 8)
      : undefined;
  const result = intermediate + (addend ?? 0);

  return {
    type,
    difficulty,
    left,
    right,
    operator,
    result,
    family: left === 0 ? 'zero' : familyOf(left, right),
    addend,
    intermediate: type === 'expression' ? intermediate : undefined,
    inversePrompt: type === 'inverseDivision' ? `${formatTerm(right)} × ? = ${formatSigned(left)}` : undefined,
  };
}

function promptFor(payload: SignRuleQuestionPayload): string {
  if (payload.type === 'inverseDivision') return payload.inversePrompt!;
  if (payload.type === 'expression') {
    return `${expression(payload.left, payload.operator, payload.right)} ${payload.addend! < 0 ? '−' : '+'} ${Math.abs(payload.addend!)}`;
  }
  return expression(payload.left, payload.operator, payload.right);
}

export function assertSignRuleQuestionIsSound(question: TrainingQuestion<SignRuleQuestionPayload>): void {
  const payload = question.payload!;
  const operationResult = applyOperation(payload.left, payload.operator, payload.right);
  const expected = operationResult + (payload.addend ?? 0);
  if (!Number.isInteger(operationResult) || question.answer !== String(payload.type === 'signFirst' || payload.type === 'signOnly'
    ? (expected > 0 ? 'positive' : 'negative')
    : expected)) {
    throw new Error(`sign rules: incorrect answer for ${question.prompt}`);
  }
  if (payload.operator === '÷' && payload.right === 0) throw new Error('sign rules: zero divisor');
  if (payload.operator === '÷' && payload.left !== operationResult * payload.right) throw new Error('sign rules: inexact division');
  if (payload.family !== (payload.left === 0 ? 'zero' : familyOf(payload.left, payload.right))) {
    throw new Error('sign rules: incorrect sign family');
  }
  if (new Set(question.options).size !== question.options.length) throw new Error('sign rules: duplicate options');
  if (question.options.filter((option) => option === question.answer).length !== 1) {
    throw new Error('sign rules: answer must appear exactly once');
  }
  if (payload.type === 'expression' && payload.intermediate !== operationResult) {
    throw new Error('sign rules: incorrect intermediate step');
  }
}

export function classifySignRule(payload: SignRuleQuestionPayload, answer: string): SignRuleMistake {
  const numeric = Number(answer);
  if (Number.isFinite(numeric) && numeric === -payload.result && payload.result !== 0) return 'signError';
  return 'magnitudeError';
}

export function expressionSteps(payload: SignRuleQuestionPayload): string[] {
  if (payload.type !== 'expression' || payload.intermediate === undefined || payload.addend === undefined) return [];
  return [
    `${expression(payload.left, payload.operator, payload.right)} = ${formatSigned(payload.intermediate)}`,
    `${signedAdd(payload.intermediate, payload.addend)} = ${formatSigned(payload.result)}`,
  ];
}

export function buildSignRulesQuestions(
  input: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion<SignRuleQuestionPayload>[] {
  const difficulty = difficultyOf(input.difficultyId);
  const questions: TrainingQuestion<SignRuleQuestionPayload>[] = [];
  for (let index = 0; index < input.count; index += 1) {
    const type = typeFor(difficulty, index, random);
    const forceZero = index === 4 || (input.count > 10 && index % 11 === 10);
    const payload = buildPayload(difficulty, type, FAMILIES[index % FAMILIES.length], random, forceZero);
    const signQuestion = (type === 'signFirst' || type === 'signOnly') && payload.result !== 0;
    if (!signQuestion && (type === 'signFirst' || type === 'signOnly')) payload.type = difficulty === 'basic' ? 'multiply' : 'mixed';
    const answer = signQuestion ? (payload.result > 0 ? 'positive' : 'negative') : String(payload.result);
    const options = signQuestion
      ? shuffle(['positive', 'negative'], random)
      : shuffle([payload.result, ...numericDistractors(payload)], random).map(String);
    const question = {
      id: `sign-rules-${index}`,
      prompt: promptFor(payload),
      answer,
      options,
      payload,
    };
    assertSignRuleQuestionIsSound(question);
    questions.push(question);
  }
  return questions;
}

export function buildSignRulesQuestionsForSeed(
  input: { difficultyId: string | null; count: number },
  seed: number,
): TrainingQuestion<SignRuleQuestionPayload>[] {
  return buildSignRulesQuestions(input, seededRandom(seed));
}

export const signRulesActivity: TrainingActivityDefinition<SignRuleQuestionPayload> = {
  id: SIGN_RULES_ID,
  i18nPrefix: 'signRules',
  capabilities: {
    questionCounts: [5, 10, 20, 50],
    defaultQuestionCount: 10,
    difficulties: (['basic', 'intermediate', 'hard'] as const).map((id) => ({
      id,
      labelKey: `training.difficulty.${id}`,
      descriptionKey: `signRules.difficulty.${id}`,
    })),
    defaultDifficultyId: 'basic',
    supportsChallenge: true,
    challengeQuestionCounts: [20, 50],
    paceRecordMinAccuracy: 1,
    rulesVersion: SIGN_RULES_RULES_VERSION,
  },
  generateQuestions: buildSignRulesQuestions,
};
