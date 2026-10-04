import { describe, expect, it } from 'vitest';
import {
  ARITHMETIC_ADDITION_REGROUPING,
  ARITHMETIC_CHOICES,
  ARITHMETIC_FACTS_TO_20,
  ARITHMETIC_SKILL_IDS,
  ARITHMETIC_SUBTRACTION_REGROUPING,
  ARITHMETIC_TWO_DIGIT_PLAIN,
  MAX_DISTRACTOR_DISTANCE,
  MINUS,
  arithmeticDistractors,
  arithmeticFluencyActivities,
  assertSoundExpression,
  buildArithmeticQuestions,
  generateArithmeticExpression,
  getArithmeticActivity,
  requiresBorrow,
  requiresCarry,
  type ArithmeticExpression,
  type ArithmeticSkillId,
} from '../arithmeticFluencyData';
import { seededRandom } from '../../../utils/random';

const DIFFICULTIES = ['basic', 'intermediate', 'hard'] as const;

/**
 * Deliberately large: these generators are the whole pedagogical claim of the
 * unit, so every invariant is checked against thousands of samples spread over
 * many seeds rather than a handful of hand-picked examples.
 */
const SAMPLES_PER_CASE = 600;

/** Every (skill, difficulty) pair, each with a big sample of expressions. */
function sample(skillId: ArithmeticSkillId, difficultyId: string): ArithmeticExpression[] {
  const random = seededRandom(skillId.length * 7919 + difficultyId.length * 104_729 + 13);
  return Array.from({ length: SAMPLES_PER_CASE }, () =>
    generateArithmeticExpression(skillId, difficultyId, random),
  );
}

const ALL: { skillId: ArithmeticSkillId; difficultyId: string; expressions: ArithmeticExpression[] }[] =
  ARITHMETIC_SKILL_IDS.flatMap((skillId) =>
    DIFFICULTIES.map((difficultyId) => ({ skillId, difficultyId, expressions: sample(skillId, difficultyId) })),
  );

function expressionsFor(skillId: ArithmeticSkillId): ArithmeticExpression[] {
  return ALL.filter((entry) => entry.skillId === skillId).flatMap((entry) => entry.expressions);
}

const ones = (value: number) => value % 10;
const tens = (value: number) => Math.floor(value / 10);

describe('arithmetic fluency — universal invariants', () => {
  it('always labels an expression with its real arithmetic result', () => {
    for (const { expressions } of ALL) {
      for (const { left, right, operator, answer } of expressions) {
        expect(answer).toBe(operator === '+' ? left + right : left - right);
      }
    }
  });

  it('never produces a negative answer, in any skill or difficulty', () => {
    for (const { expressions } of ALL) {
      for (const expression of expressions) {
        expect(expression.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('only ever uses addition or subtraction, with whole operands', () => {
    for (const { expressions } of ALL) {
      for (const { left, right, operator } of expressions) {
        expect([`+`, MINUS]).toContain(operator);
        expect(Number.isInteger(left)).toBe(true);
        expect(Number.isInteger(right)).toBe(true);
      }
    }
  });

  it('actually exercises every difficulty (the bands are not silently identical)', () => {
    for (const skillId of ARITHMETIC_SKILL_IDS) {
      const signatures = DIFFICULTIES.map((difficultyId) => {
        const values = ALL.find((e) => e.skillId === skillId && e.difficultyId === difficultyId)!.expressions;
        return Math.round(values.reduce((sum, e) => sum + e.left, 0) / values.length);
      });
      expect(new Set(signatures).size).toBe(DIFFICULTIES.length);
    }
  });
});

describe('arithmetic fluency — skill 1: facts to 20', () => {
  const expressions = expressionsFor(ARITHMETIC_FACTS_TO_20);

  it('keeps every operand and every answer inside the first two tens', () => {
    for (const { left, right, answer } of expressions) {
      expect(left).toBeGreaterThan(0);
      expect(left).toBeLessThanOrEqual(20);
      expect(right).toBeGreaterThan(0);
      expect(right).toBeLessThanOrEqual(20);
      expect(answer).toBeLessThanOrEqual(20);
    }
  });

  it('never subtracts below zero — the minuend always leads', () => {
    for (const expression of expressions) {
      if (expression.operator === MINUS) {
        expect(expression.left).toBeGreaterThan(expression.right);
        expect(expression.answer).toBeGreaterThan(0);
      }
    }
  });

  it('practises both operations, not one of them by accident', () => {
    const additions = expressions.filter((e) => e.operator === '+').length;
    expect(additions).toBeGreaterThan(expressions.length * 0.3);
    expect(additions).toBeLessThan(expressions.length * 0.7);
  });

  it('bridges the ten on hard and never bridges it on the easier bands', () => {
    const band = (difficultyId: string) =>
      ALL.find((e) => e.skillId === ARITHMETIC_FACTS_TO_20 && e.difficultyId === difficultyId)!.expressions;

    for (const expression of band('basic')) {
      // Basic lives entirely inside a single ten.
      expect(expression.left).toBeLessThanOrEqual(10);
      expect(expression.answer).toBeLessThanOrEqual(10);
    }

    for (const { left, right, operator } of band('intermediate')) {
      // Teen work, but the ones column is never broken open in either direction.
      expect(operator === '+' ? requiresCarry(left, right) : requiresBorrow(left, right)).toBe(false);
    }

    for (const { left, right, operator } of band('hard')) {
      // Hard is precisely the bridging facts: 7+5, 15−7.
      expect(operator === '+' ? requiresCarry(left, right) : requiresBorrow(left, right)).toBe(true);
    }
  });
});

describe('arithmetic fluency — skill 2: two digits without regrouping', () => {
  const expressions = expressionsFor(ARITHMETIC_TWO_DIGIT_PLAIN);

  it('uses two genuine two-digit numbers every time', () => {
    for (const { left, right } of expressions) {
      expect(left).toBeGreaterThanOrEqual(10);
      expect(left).toBeLessThanOrEqual(99);
      expect(right).toBeGreaterThanOrEqual(10);
      expect(right).toBeLessThanOrEqual(99);
    }
  });

  it('never requires a carry, checked digit by digit', () => {
    const additions = expressions.filter((e) => e.operator === '+');
    expect(additions.length).toBeGreaterThan(0);
    for (const { left, right } of additions) {
      expect(ones(left) + ones(right)).toBeLessThanOrEqual(9);
      expect(tens(left) + tens(right)).toBeLessThanOrEqual(9);
      expect(requiresCarry(left, right)).toBe(false);
    }
  });

  it('never requires a borrow, checked digit by digit', () => {
    const subtractions = expressions.filter((e) => e.operator === MINUS);
    expect(subtractions.length).toBeGreaterThan(0);
    for (const { left, right } of subtractions) {
      expect(ones(left)).toBeGreaterThanOrEqual(ones(right));
      expect(tens(left)).toBeGreaterThanOrEqual(tens(right));
      expect(requiresBorrow(left, right)).toBe(false);
    }
  });

  it('makes the tens column do real work rather than matching it away', () => {
    // With equal tens digits (38 − 37) the question collapses to a single-digit
    // subtraction, which is not the skill being practised.
    for (const { left, right, operator, answer } of expressions) {
      if (operator !== MINUS) continue;
      expect(tens(left)).toBeGreaterThan(tens(right));
      expect(answer).toBeGreaterThanOrEqual(10);
    }
  });

  it('never asks a question whose answer is zero', () => {
    for (const { answer } of expressions) expect(answer).toBeGreaterThan(0);
  });
});

describe('arithmetic fluency — skill 3: addition with regrouping', () => {
  const expressions = expressionsFor(ARITHMETIC_ADDITION_REGROUPING);

  it('is always an addition of two two-digit numbers', () => {
    for (const { left, right, operator } of expressions) {
      expect(operator).toBe('+');
      expect(left).toBeGreaterThanOrEqual(10);
      expect(left).toBeLessThanOrEqual(99);
      expect(right).toBeGreaterThanOrEqual(10);
      expect(right).toBeLessThanOrEqual(99);
    }
  });

  it('ALWAYS requires carrying — every single question, not just most', () => {
    for (const { left, right } of expressions) {
      expect(ones(left) + ones(right)).toBeGreaterThanOrEqual(10);
      expect(requiresCarry(left, right)).toBe(true);
    }
  });

  it('keeps the total inside 100, so the answer stays two digits', () => {
    for (const { answer } of expressions) {
      expect(answer).toBeGreaterThanOrEqual(10);
      expect(answer).toBeLessThanOrEqual(99);
    }
  });
});

describe('arithmetic fluency — skill 4: subtraction with regrouping', () => {
  const expressions = expressionsFor(ARITHMETIC_SUBTRACTION_REGROUPING);

  it('is always a subtraction of two two-digit numbers', () => {
    for (const { left, right, operator } of expressions) {
      expect(operator).toBe(MINUS);
      expect(left).toBeGreaterThanOrEqual(10);
      expect(left).toBeLessThanOrEqual(99);
      expect(right).toBeGreaterThanOrEqual(10);
      expect(right).toBeLessThanOrEqual(99);
    }
  });

  it('ALWAYS requires borrowing — every single question', () => {
    for (const { left, right } of expressions) {
      expect(ones(left)).toBeLessThan(ones(right));
      expect(requiresBorrow(left, right)).toBe(true);
    }
  });

  it('always stays non-negative even though the ones column is broken open', () => {
    for (const { left, right, answer } of expressions) {
      expect(left).toBeGreaterThan(right);
      expect(answer).toBeGreaterThan(0);
      expect(answer).toBeLessThanOrEqual(89);
    }
  });
});

describe('arithmetic fluency — answer options', () => {
  const sessions = ARITHMETIC_SKILL_IDS.flatMap((skillId) =>
    DIFFICULTIES.map((difficultyId) => ({
      skillId,
      difficultyId,
      questions: buildArithmeticQuestions(skillId, { difficultyId, count: 200 }, seededRandom(4242)),
    })),
  );

  it('offers exactly four options with exactly one correct answer', () => {
    for (const { questions } of sessions) {
      for (const question of questions) {
        expect(question.options).toHaveLength(ARITHMETIC_CHOICES);
        expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
      }
    }
  });

  it('never repeats an option inside one question', () => {
    for (const { questions } of sessions) {
      for (const question of questions) {
        expect(new Set(question.options).size).toBe(ARITHMETIC_CHOICES);
      }
    }
  });

  it('keeps every option a positive whole number', () => {
    for (const { questions } of sessions) {
      for (const question of questions) {
        for (const option of question.options) {
          expect(option).toMatch(/^\d+$/);
          expect(Number(option)).toBeGreaterThan(0);
        }
      }
    }
  });

  it("matches the prompt's arithmetic to the stated correct answer", () => {
    for (const { questions } of sessions) {
      for (const question of questions) {
        const [left, operator, right] = question.prompt.split(' ');
        const expected = operator === '+' ? Number(left) + Number(right) : Number(left) - Number(right);
        expect(question.answer).toBe(String(expected));
      }
    }
  });

  it('builds distractors close enough to be plausible, never absurd', () => {
    for (const { questions } of sessions) {
      for (const question of questions) {
        const answer = Number(question.answer);
        for (const option of question.options) {
          // Every candidate is a real slip (a dropped carry, a column shift, a
          // read-the-sign-wrong), so nothing lands far from the true value and
          // no option can be ruled out without doing the arithmetic.
          expect(Math.abs(Number(option) - answer)).toBeLessThanOrEqual(MAX_DISTRACTOR_DISTANCE);
        }
      }
    }
  });

  it('never offers the correct answer twice under a different guise', () => {
    for (const { skillId, difficultyId } of ALL) {
      const random = seededRandom(99);
      for (let i = 0; i < 300; i += 1) {
        const expression = generateArithmeticExpression(skillId, difficultyId, random);
        const distractors = arithmeticDistractors(expression, skillId);
        expect(distractors).toHaveLength(ARITHMETIC_CHOICES - 1);
        expect(distractors).not.toContain(expression.answer);
        expect(new Set(distractors).size).toBe(ARITHMETIC_CHOICES - 1);
      }
    }
  });
});

describe('arithmetic fluency — sessions', () => {
  it('honours the requested question count exactly', () => {
    for (const skillId of ARITHMETIC_SKILL_IDS) {
      for (const count of [5, 10, 20, 50]) {
        expect(buildArithmeticQuestions(skillId, { difficultyId: 'basic', count }, seededRandom(count))).toHaveLength(
          count,
        );
      }
    }
  });

  it('gives every question in a session a unique id', () => {
    for (const skillId of ARITHMETIC_SKILL_IDS) {
      const questions = buildArithmeticQuestions(skillId, { difficultyId: 'hard', count: 50 }, seededRandom(5));
      expect(new Set(questions.map((question) => question.id)).size).toBe(50);
    }
  });

  it('keeps one session on one skill and one difficulty — no silent mixing', () => {
    for (const skillId of ARITHMETIC_SKILL_IDS) {
      for (const difficultyId of DIFFICULTIES) {
        const questions = buildArithmeticQuestions(skillId, { difficultyId, count: 50 }, seededRandom(11));
        for (const question of questions) {
          const [left, operator, right] = question.prompt.split(' ');
          // Re-running the soundness check against the parsed prompt proves the
          // rendered question, not just the internal object, obeys the skill.
          expect(() =>
            assertSoundExpression(
              {
                left: Number(left),
                right: Number(right),
                operator: operator === '+' ? '+' : MINUS,
                answer: Number(question.answer),
              },
              skillId,
            ),
          ).not.toThrow();
        }
      }
    }
  });

  it('avoids asking the identical fact twice in a row', () => {
    for (const skillId of ARITHMETIC_SKILL_IDS) {
      const questions = buildArithmeticQuestions(skillId, { difficultyId: 'basic', count: 50 }, seededRandom(3));
      for (let i = 1; i < questions.length; i += 1) {
        expect(questions[i].prompt).not.toBe(questions[i - 1].prompt);
      }
    }
  });

  it('is reproducible for a given seed', () => {
    for (const skillId of ARITHMETIC_SKILL_IDS) {
      const first = buildArithmeticQuestions(skillId, { difficultyId: 'intermediate', count: 20 }, seededRandom(77));
      const second = buildArithmeticQuestions(skillId, { difficultyId: 'intermediate', count: 20 }, seededRandom(77));
      expect(first).toEqual(second);
    }
  });
});

describe('arithmetic fluency — soundness guard', () => {
  it('rejects a mislabelled result', () => {
    expect(() =>
      assertSoundExpression({ left: 7, right: 5, operator: '+', answer: 13 }, ARITHMETIC_FACTS_TO_20),
    ).toThrow(/not 12/);
  });

  it('rejects a negative subtraction', () => {
    expect(() =>
      assertSoundExpression({ left: 3, right: 8, operator: MINUS, answer: -5 }, ARITHMETIC_FACTS_TO_20),
    ).toThrow(/negative/);
  });

  it('rejects a "no regrouping" question that actually carries', () => {
    expect(() =>
      assertSoundExpression({ left: 28, right: 17, operator: '+', answer: 45 }, ARITHMETIC_TWO_DIGIT_PLAIN),
    ).toThrow(/needs regrouping/);
  });

  it('rejects a "no regrouping" question that actually borrows', () => {
    expect(() =>
      assertSoundExpression({ left: 52, right: 28, operator: MINUS, answer: 24 }, ARITHMETIC_TWO_DIGIT_PLAIN),
    ).toThrow(/needs regrouping/);
  });

  it('rejects a regrouping addition that never carries', () => {
    expect(() =>
      assertSoundExpression({ left: 23, right: 14, operator: '+', answer: 37 }, ARITHMETIC_ADDITION_REGROUPING),
    ).toThrow(/never carries/);
  });

  it('rejects a regrouping subtraction that never borrows', () => {
    expect(() =>
      assertSoundExpression({ left: 57, right: 25, operator: MINUS, answer: 32 }, ARITHMETIC_SUBTRACTION_REGROUPING),
    ).toThrow(/never borrows/);
  });
});

describe('arithmetic fluency — training capabilities', () => {
  it('registers exactly the four foundational skills', () => {
    expect(arithmeticFluencyActivities).toHaveLength(4);
    expect(arithmeticFluencyActivities.map((activity) => activity.id)).toEqual(ARITHMETIC_SKILL_IDS);
  });

  it('offers the shared fluency lengths and restricts challenge to the longer ones', () => {
    for (const activity of arithmeticFluencyActivities) {
      expect(activity.capabilities.questionCounts).toEqual([5, 10, 20, 50]);
      expect(activity.capabilities.defaultQuestionCount).toBe(10);
      expect(activity.capabilities.supportsChallenge).toBe(true);
      expect(activity.capabilities.challengeQuestionCounts).toEqual([20, 50]);
      // A speed record has to be earned on a flawless run.
      expect(activity.capabilities.paceRecordMinAccuracy).toBe(1);
      expect(activity.capabilities.difficulties.map((option) => option.id)).toEqual([...DIFFICULTIES]);
    }
  });

  it('generates through the activity definition itself', () => {
    for (const skillId of ARITHMETIC_SKILL_IDS) {
      const activity = getArithmeticActivity(skillId);
      const questions = activity.generateQuestions({ difficultyId: 'hard', count: 20 });
      expect(questions).toHaveLength(20);
      for (const question of questions) {
        expect(question.options).toContain(question.answer);
      }
    }
  });

  it('refuses an unknown skill id', () => {
    expect(() => getArithmeticActivity('nope' as ArithmeticSkillId)).toThrow(/unknown skill/);
  });
});
