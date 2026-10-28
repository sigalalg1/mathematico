import type { AngleRef, AngleType7, VertexScene } from '../../geometry/types';
import type { QuickRecapQuestion } from '../../types/anglesGrade7';
import {
  CLASSIFICATION_SAFETY_MARGIN_DEG,
  classifyAngle7,
  isUnambiguouslyClassifiable,
  pointFromAngle,
  resolveAngle,
} from '../../geometry/angleMath';
import { allValidThreeLetterNames, greekLetterForIndex, invalidAngleName, isValidAngleName, threeLetterName } from '../../geometry/angleNotation';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import { buildVertexScene, pickLabels, randomBaseRotation, STAGE_CENTER } from './anglesGrade7Shared';

/**
 * "Quick Recap" — a short, playful, mixed-topic review round for the whole
 * Grade 7 Angles unit (own build; requested directly by a parent reviewing
 * exam material with their child, not sourced from the textbook excerpt —
 * see the final report). It is deliberately NOT a seventh training
 * activity with its own difficulty tiers and personal records: it is a
 * fixed, ten-question, no-setup-screen round that remixes the exact same
 * generators' underlying math (`classifyAngle7`, `isValidAngleName`,
 * `buildVertexScene`'s independent ray-length/rotation randomization, the
 * measure activity's protractor-alignment invariant) into lighter,
 * game-show-flavored copy. Every question still carries a real
 * `VertexScene` (or two, for `compare`), so the rendered diagram and the
 * graded answer can never disagree.
 */
export const ANGLES_QUICK_RECAP_RULES_VERSION = 1;
export const ANGLES_QUICK_RECAP_QUESTION_COUNT = 10;

function vertexRef(scene: VertexScene): AngleRef {
  return { vertexId: 'vertex', rayAId: scene.rays[0].id, rayBId: scene.rays[1].id };
}

// --- 1. Vocabulary: ray / angle / vertex / arms (קרן / זווית / קודקוד / שוקיים) -----------------------------------

const VOCAB_OPTION_POOL = {
  vertex: ['vertex', 'ray', 'angle', 'arms'],
  arms: ['arms', 'vertex', 'arc', 'side'],
} as const;

function makeVocabQuestion(random: () => number, index: number, kind: 'vertex' | 'arms'): QuickRecapQuestion {
  const [vertexLabel, armA, armB] = pickLabels(random, 3);
  const degrees = randomInt(random, 40, 140);
  const scene = buildVertexScene(random, vertexLabel, [0, degrees], [armA, armB], { baseRotationDeg: randomBaseRotation(random, 'basic') });
  const options = shuffle([...VOCAB_OPTION_POOL[kind]], random);
  return {
    id: `quick-recap-vocab-${kind}-${index}`,
    topic: 'vocab',
    promptKey: `anglesGrade7.quickRecap.vocab.prompt.${kind}`,
    scene,
    highlightedRef: vertexRef(scene),
    optionRender: 'label',
    answer: kind,
    options,
    feedbackKey: `anglesGrade7.quickRecap.vocab.feedback.${kind}`,
  };
}

// --- 2. Angle types: acute / right / obtuse / straight --------------------------------------------------------

const TYPE_POOL: AngleType7[] = ['acute', 'right', 'obtuse', 'straight'];
// One extra degree of headroom beyond `CLASSIFICATION_SAFETY_MARGIN_DEG`
// itself: `buildVertexScene`'s rotation math (sin/cos of non-trivial degree
// values) introduces floating-point noise on the order of 1e-13°, which is
// otherwise enough to push a boundary value picked at *exactly* the margin
// (e.g. precisely 102°) a hair outside `isUnambiguouslyClassifiable`'s own
// strict `>=` check. A full extra degree is vastly more than that noise ever
// needs, while still well within "quick recap" territory.
const FLOAT_SAFE_MARGIN_DEG = CLASSIFICATION_SAFETY_MARGIN_DEG + 1;
const ACUTE_RANGE = { min: FLOAT_SAFE_MARGIN_DEG, max: 90 - FLOAT_SAFE_MARGIN_DEG };
const OBTUSE_RANGE = { min: 90 + FLOAT_SAFE_MARGIN_DEG, max: 180 - FLOAT_SAFE_MARGIN_DEG };

/** Same safety-margin convention `anglesTypesData` uses — see `isUnambiguouslyClassifiable`. */
function pickDegreesForType(random: () => number, type: AngleType7): number {
  if (type === 'right') return 90;
  if (type === 'straight') return 180;
  const range = type === 'acute' ? ACUTE_RANGE : OBTUSE_RANGE;
  return randomInt(random, range.min, range.max);
}

function makeClassifyQuestion(random: () => number, index: number): QuickRecapQuestion {
  const type = pickRandom(random, TYPE_POOL);
  const degrees = pickDegreesForType(random, type);
  const [vertexLabel, armA, armB] = pickLabels(random, 3);
  const scene = buildVertexScene(random, vertexLabel, [0, degrees], [armA, armB], { baseRotationDeg: randomBaseRotation(random, 'basic') });
  return {
    id: `quick-recap-types-${index}`,
    topic: 'types',
    promptKey: 'anglesGrade7.quickRecap.types.prompt',
    scene,
    highlightedRef: vertexRef(scene),
    optionRender: 'angleType',
    answer: type,
    options: shuffle([...TYPE_POOL], random),
    feedbackKey: `anglesGrade7.quickRecap.types.feedback.${type}`,
  };
}

// --- 3. Notation: the ∠ symbol, middle-letter rule, name equivalence, Greek shorthand ---------------------------

function makeNotationSelectQuestion(random: () => number, index: number): QuickRecapQuestion {
  const [vertexLabel, armA, armB, unrelated] = pickLabels(random, 4);
  const degrees = randomInt(random, 30, 150);
  const scene = buildVertexScene(random, vertexLabel, [0, degrees], [armA, armB], { baseRotationDeg: randomBaseRotation(random, 'basic') });
  const armPair: [string, string] = [armA, armB];
  const correct = pickRandom(random, allValidThreeLetterNames(vertexLabel, armPair));
  const variantA = threeLetterName(vertexLabel, armA, armB); // classic wrong-vertex mistake, slot 1
  const variantB = threeLetterName(armA, armB, vertexLabel); // classic wrong-vertex mistake, slot 2
  const variantC = threeLetterName(unrelated, vertexLabel, armB); // wrong-arm mistake
  const greekLetter = greekLetterForIndex(index % 4) ?? 'α';
  return {
    id: `quick-recap-notation-select-${index}`,
    topic: 'notation',
    promptKey: 'anglesGrade7.quickRecap.notation.prompt.selectNameGreek',
    promptValues: { letter: greekLetter },
    scene,
    highlightedRef: vertexRef(scene),
    notationMode: 'selectValid',
    optionRender: 'angleName',
    answer: correct,
    options: shuffle([correct, variantA, variantB, variantC], random),
    feedbackKey: 'anglesGrade7.quickRecap.notation.feedback.selectName',
  };
}

function makeNotationInvalidQuestion(random: () => number, index: number): QuickRecapQuestion {
  const [vertexLabel, armA, armB] = pickLabels(random, 3);
  const degrees = randomInt(random, 30, 150);
  const scene = buildVertexScene(random, vertexLabel, [0, degrees], [armA, armB], { baseRotationDeg: randomBaseRotation(random, 'basic') });
  const armPair: [string, string] = [armA, armB];
  const [validA, validB] = allValidThreeLetterNames(vertexLabel, armPair);
  const invalid = invalidAngleName(vertexLabel, armPair, 'wrongVertex');
  return {
    id: `quick-recap-notation-invalid-${index}`,
    topic: 'notation',
    promptKey: 'anglesGrade7.quickRecap.notation.prompt.selectInvalid',
    scene,
    highlightedRef: vertexRef(scene),
    notationMode: 'selectInvalid',
    optionRender: 'angleName',
    answer: invalid,
    options: shuffle([validA, validB, invalid], random),
    feedbackKey: 'anglesGrade7.quickRecap.notation.feedback.selectInvalid',
  };
}

// --- 4. Comparison: real opening, never ray length or rotation --------------------------------------------------

function buildCompareSide(random: () => number, vertexLabel: string, armLabels: [string, string], degrees: number) {
  const scene = buildVertexScene(random, vertexLabel, [0, degrees], armLabels, { baseRotationDeg: randomBaseRotation(random, 'basic') });
  return { scene, ref: vertexRef(scene) };
}

/**
 * `forceEqual` guarantees one of the round's two compare questions is
 * deliberately the equal case — two angles with the exact same measure,
 * independently rotated and independently ray-length-randomized — so the
 * round always directly exercises the "rotation/ray length never change the
 * real size" misconception at least once, rather than leaving it to chance.
 */
function makeCompareQuestion(random: () => number, index: number, forceEqual: boolean): QuickRecapQuestion {
  const labels = pickLabels(random, 6);
  const leftVertex = labels[0];
  const leftArms: [string, string] = [labels[1], labels[2]];
  const rightVertex = labels[3];
  const rightArms: [string, string] = [labels[4], labels[5]];

  const leftDegrees = randomInt(random, 20, 160);
  let rightDegrees: number;
  if (forceEqual) {
    rightDegrees = leftDegrees;
  } else {
    const minGap = 20;
    let candidate: number;
    let attempts = 0;
    do {
      const sign = random() < 0.5 ? -1 : 1;
      candidate = leftDegrees + sign * (minGap + randomInt(random, 0, 30));
      attempts += 1;
    } while ((candidate < 10 || candidate > 170) && attempts < 50);
    rightDegrees = Math.min(170, Math.max(10, candidate));
    if (Math.abs(rightDegrees - leftDegrees) < minGap) {
      rightDegrees = leftDegrees >= 90 ? leftDegrees - minGap : leftDegrees + minGap;
    }
  }

  const left = buildCompareSide(random, leftVertex, leftArms, leftDegrees);
  const right = buildCompareSide(random, rightVertex, rightArms, rightDegrees);
  const answer = leftDegrees < rightDegrees ? '<' : leftDegrees > rightDegrees ? '>' : '=';

  return {
    id: `quick-recap-compare-${index}`,
    topic: 'compare',
    promptKey: 'anglesGrade7.quickRecap.compare.prompt',
    compare: { left, right },
    optionRender: 'compareSymbol',
    answer,
    options: ['<', '=', '>'],
    feedbackKey: `anglesGrade7.quickRecap.compare.feedback.${answer === '<' ? 'less' : answer === '>' ? 'greater' : 'equal'}`,
  };
}

// --- 5. Measurement: what a protractor is for, and reading one --------------------------------------------------

function buildMeasureScene(random: () => number, targetDegrees: number): { scene: VertexScene; baselineRayId: string } {
  const vertex = STAGE_CENTER;
  const baseRotationDeg = randomBaseRotation(random, 'basic');
  const fixedThrough = pointFromAngle(vertex, baseRotationDeg, 100);
  const measuredThrough = pointFromAngle(vertex, baseRotationDeg + targetDegrees, 100);
  const scene: VertexScene = {
    vertex: { id: 'vertex', label: '', point: vertex },
    rays: [
      { id: 'fixed', label: '', through: fixedThrough },
      { id: 'measured', label: '', through: measuredThrough },
    ],
  };
  return { scene, baselineRayId: 'fixed' };
}

/** Always a multiple of 10° (a protractor's own major tick) — the quickest, least ambiguous reading for a light recap round. */
function pickNiceTargetDegrees(random: () => number): number {
  return randomInt(random, 2, 16) * 10; // 20..160
}

function makeMeasureReadQuestion(random: () => number, index: number): QuickRecapQuestion {
  const targetDegrees = pickNiceTargetDegrees(random);
  const { scene, baselineRayId } = buildMeasureScene(random, targetDegrees);
  const pool: number[] = [];
  for (let d = 10; d <= 170; d += 10) if (d !== targetDegrees) pool.push(d);
  const distractors = shuffle(pool, random).slice(0, 3);
  return {
    id: `quick-recap-measure-read-${index}`,
    topic: 'measure',
    promptKey: 'anglesGrade7.quickRecap.measure.prompt.read',
    scene,
    protractorBaselineRayId: baselineRayId,
    optionRender: 'degrees',
    answer: String(targetDegrees),
    options: shuffle([targetDegrees, ...distractors].map(String), random),
    feedbackKey: 'anglesGrade7.quickRecap.measure.feedback.read',
  };
}

const MEASURE_PURPOSE_OPTIONS = ['measureDegrees', 'measureLength', 'drawLine', 'countVertices'];

function makeMeasurePurposeQuestion(random: () => number, index: number): QuickRecapQuestion {
  const targetDegrees = pickNiceTargetDegrees(random);
  const { scene, baselineRayId } = buildMeasureScene(random, targetDegrees);
  return {
    id: `quick-recap-measure-purpose-${index}`,
    topic: 'measure',
    promptKey: 'anglesGrade7.quickRecap.measure.prompt.purpose',
    scene,
    protractorBaselineRayId: baselineRayId,
    optionRender: 'label',
    answer: 'measureDegrees',
    options: shuffle([...MEASURE_PURPOSE_OPTIONS], random),
    feedbackKey: 'anglesGrade7.quickRecap.measure.feedback.purpose',
  };
}

// --- Assembly + soundness ----------------------------------------------------------------------------------------

export function buildAnglesQuickRecapQuestions(seed?: number): QuickRecapQuestion[] {
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const questions: QuickRecapQuestion[] = [
    makeVocabQuestion(random, 0, 'vertex'),
    makeVocabQuestion(random, 1, 'arms'),
    makeClassifyQuestion(random, 2),
    makeClassifyQuestion(random, 3),
    makeNotationSelectQuestion(random, 4),
    makeNotationInvalidQuestion(random, 5),
    makeCompareQuestion(random, 6, false),
    makeCompareQuestion(random, 7, true),
    makeMeasureReadQuestion(random, 8),
    makeMeasurePurposeQuestion(random, 9),
  ];
  questions.forEach(assertQuickRecapQuestionIsSound);
  return questions;
}

/** Programmatic soundness check — every generated round is verified against this before it is ever handed to a page. */
export function assertQuickRecapQuestionIsSound(question: QuickRecapQuestion): void {
  if (new Set(question.options).size !== question.options.length) {
    throw new Error(`quick recap question ${question.id}: duplicate options`);
  }
  if (question.options.filter((option) => option === question.answer).length !== 1) {
    throw new Error(`quick recap question ${question.id}: must have exactly one correct option`);
  }

  if (question.topic === 'types') {
    const resolved = resolveAngle(question.scene!, question.highlightedRef!);
    if (classifyAngle7(resolved.degrees) !== question.answer) {
      throw new Error(`quick recap question ${question.id}: answer disagrees with the actual measured angle (${resolved.degrees}°)`);
    }
    if (!isUnambiguouslyClassifiable(resolved.degrees)) {
      throw new Error(`quick recap question ${question.id}: angle ${resolved.degrees}° violates the mandatory classification safety margin`);
    }
  }

  if (question.topic === 'notation') {
    const resolved = resolveAngle(question.scene!, question.highlightedRef!);
    const vertexLabel = question.scene!.vertex.label;
    const armLabels: [string, string] = [resolved.rayA.label, resolved.rayB.label];
    for (const option of question.options) {
      const actuallyValid = isValidAngleName(option, vertexLabel, armLabels);
      const shouldBeValid = question.notationMode === 'selectInvalid' ? option !== question.answer : option === question.answer;
      if (actuallyValid !== shouldBeValid) {
        throw new Error(`quick recap question ${question.id}: option "${option}" validity is ${actuallyValid}, expected ${shouldBeValid}`);
      }
    }
  }

  if (question.topic === 'compare') {
    const { left, right } = question.compare!;
    const leftDegrees = resolveAngle(left.scene, left.ref).degrees;
    const rightDegrees = resolveAngle(right.scene, right.ref).degrees;
    // Each side is independently rotated, so a true "equal" pair can differ by
    // a hair of floating-point noise even though the intended measures are
    // bit-identical — the same tolerant comparison `anglesCompareData` uses.
    const diff = leftDegrees - rightDegrees;
    const expected = diff < -1e-3 ? '<' : diff > 1e-3 ? '>' : '=';
    if (expected !== question.answer) {
      throw new Error(`quick recap question ${question.id}: compare answer disagrees with the actual measured angles`);
    }
  }

  if (question.topic === 'measure' && question.optionRender === 'degrees') {
    const resolved = resolveAngle(question.scene!, { vertexId: 'vertex', rayAId: 'fixed', rayBId: 'measured' });
    if (Math.abs(resolved.degrees - Number(question.answer)) > 1e-6) {
      throw new Error(`quick recap question ${question.id}: measured answer disagrees with the actual drawn angle`);
    }
  }
}
