import { SUPPORTED_SCALES } from '../../types/coordinateScale';
import type {
  Point,
  ScaleAnchor,
  ScaleChallenge,
  ScaleEvidence,
  ScaleMistakeKind,
  ScaleOption,
  ScaleQuestionKind,
  ScaleValue,
} from '../../types/coordinateScale';
import { shuffle } from '../../utils/shuffle';

export const COORDINATE_SCALE_MIN = -5;
export const COORDINATE_SCALE_MAX = 5;

const OPTION_LABELS = ['P', 'Q', 'R', 'S'] as const;
const ANCHOR_LABEL = 'A';
const TARGET_LABEL = 'B';

const MAX_ATTEMPTS = 2000;

// --- small numeric helpers --------------------------------------------------

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function isTickIndex(n: number): boolean {
  return Number.isInteger(n) && n >= COORDINATE_SCALE_MIN && n <= COORDINATE_SCALE_MAX;
}

function isTickPoint(p: Point): boolean {
  return isTickIndex(p.x) && isTickIndex(p.y);
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

/**
 * Real value shown for a tick index. Every value used by this game is an
 * integer number of ticks times a scale from {0.5, 1, 2, 5, 10}, so the
 * product is always exact in IEEE754 — comparisons stay trivially safe.
 */
function valueAt(tick: number, scale: ScaleValue): number {
  return tick * scale;
}

export function formatScaleValue(value: number): string {
  return value === 0 ? '0' : String(value);
}

// --- meaningful wrong answers ----------------------------------------------

interface MistakeCandidate {
  kind: ScaleMistakeKind;
  tick: Point;
}

/**
 * Every plausible mistake for a target, expressed as the grid square the
 * student would click. Nothing random and nothing arbitrary: each entry is a
 * named misconception.
 */
function mistakeCandidates(targetTick: Point, scale: ScaleValue, onAxis: 'x' | 'y' | null): MistakeCandidate[] {
  const value = { x: valueAt(targetTick.x, scale), y: valueAt(targetTick.y, scale) };
  const candidates: MistakeCandidate[] = [];

  // "I read the grid with some other scale." other === 1 is the classic
  // every-square-is-one-unit assumption and gets its own name.
  for (const other of SUPPORTED_SCALES) {
    if (other === scale) continue;
    candidates.push({
      kind: other === 1 ? 'scaleAsOne' : 'wrongScale',
      tick: { x: value.x / other, y: value.y / other },
    });
  }

  if (onAxis === null) {
    candidates.push({ kind: 'swappedXY', tick: { x: targetTick.y, y: targetTick.x } });
    candidates.push({ kind: 'signError', tick: { x: -targetTick.x, y: targetTick.y } });
    candidates.push({ kind: 'signError', tick: { x: targetTick.x, y: -targetTick.y } });
  } else if (onAxis === 'x') {
    candidates.push({ kind: 'signError', tick: { x: -targetTick.x, y: 0 } });
  } else {
    candidates.push({ kind: 'signError', tick: { x: 0, y: -targetTick.y } });
  }

  const seen = new Set<string>([pointKey(targetTick)]);
  const usable: MistakeCandidate[] = [];
  for (const candidate of candidates) {
    if (!isTickPoint(candidate.tick)) continue;
    // An axis question must keep every candidate on that axis.
    if (onAxis === 'x' && candidate.tick.y !== 0) continue;
    if (onAxis === 'y' && candidate.tick.x !== 0) continue;
    const key = pointKey(candidate.tick);
    if (seen.has(key)) continue;
    seen.add(key);
    usable.push(candidate);
  }
  return usable;
}

const KIND_PRIORITY: ScaleMistakeKind[] = ['scaleAsOne', 'wrongScale', 'swappedXY', 'signError'];

/** Picks distractors so the scale misconception always shows up when it can, then varies the rest. */
function chooseDistractors(candidates: MistakeCandidate[], wanted: number): MistakeCandidate[] {
  const byKind = new Map<ScaleMistakeKind, MistakeCandidate[]>();
  for (const candidate of candidates) {
    const list = byKind.get(candidate.kind) ?? [];
    list.push(candidate);
    byKind.set(candidate.kind, list);
  }

  const chosen: MistakeCandidate[] = [];
  const taken = new Set<string>();
  for (const kind of KIND_PRIORITY) {
    const list = byKind.get(kind);
    if (!list || chosen.length >= wanted) continue;
    const pick = randomOf(list);
    chosen.push(pick);
    taken.add(pointKey(pick.tick));
  }
  for (const candidate of shuffle(candidates)) {
    if (chosen.length >= wanted) break;
    if (taken.has(pointKey(candidate.tick))) continue;
    chosen.push(candidate);
    taken.add(pointKey(candidate.tick));
  }
  return chosen.slice(0, wanted);
}

// --- axis labelling ---------------------------------------------------------

function tickPool(negative: boolean): number[] {
  const positive = [1, 2, 3, 4, 5];
  return negative ? [...positive.map((n) => -n), ...positive] : positive;
}

/**
 * Picks which tick labels stay visible. The origin's 0 is always drawn, so
 * keeping two more labelled ticks makes the scale readable and unique.
 */
function buildLabeledTicks(negative: boolean, exclude: number[], preferHidden: number[]): number[] | null {
  const excluded = new Set(exclude);
  let pool = tickPool(negative).filter((n) => !excluded.has(n));
  if (pool.length < 2) return null;

  for (const hidden of preferHidden) {
    if (pool.length <= 2) break;
    pool = pool.filter((n) => n !== hidden);
  }
  // Hide roughly half of what is left: the axis stays readable but the student
  // has to work the missing values out instead of just reading them off.
  const keep = Math.max(2, Math.ceil(pool.length / 2));
  pool = shuffle(pool).slice(0, keep);
  return pool.sort((a, b) => a - b);
}

// --- level definitions ------------------------------------------------------

interface LevelSpec {
  id: string;
  kind: ScaleQuestionKind;
  evidence: ScaleEvidence;
  scales: ScaleValue[];
  negative: boolean;
  /** Keep target ticks even so the target's real coordinates stay whole numbers. */
  evenTicks?: boolean;
  /** Refuse a question that cannot show a scale-related wrong answer. */
  requireScaleFamily?: boolean;
  /** Put the anchor on odd ticks so it displays a half value such as 3.5. */
  halfAnchor?: boolean;
}

/**
 * Eight questions, easiest first. Stages exist only here — the student never
 * sees a stage number, just a steadily harder sequence.
 */
const LEVELS: LevelSpec[] = [
  { id: 'q1', kind: 'axisValue', evidence: 'labels', scales: [2], negative: false, requireScaleFamily: true },
  { id: 'q2', kind: 'axisValue', evidence: 'labels', scales: [5, 10], negative: false, requireScaleFamily: true },
  { id: 'q3', kind: 'locatePoint', evidence: 'labels', scales: [2, 5], negative: false, requireScaleFamily: true },
  { id: 'q4', kind: 'locatePoint', evidence: 'labels', scales: [0.5], negative: false },
  { id: 'q5', kind: 'locatePoint', evidence: 'labels', scales: [2, 5, 10], negative: true, requireScaleFamily: true },
  { id: 'q6', kind: 'locatePoint', evidence: 'anchor', scales: [2, 5], negative: false, requireScaleFamily: true },
  { id: 'q7', kind: 'locatePoint', evidence: 'anchor', scales: [0.5], negative: false, evenTicks: true, halfAnchor: true, requireScaleFamily: true },
  { id: 'q8', kind: 'locatePoint', evidence: 'anchor', scales: [2, 5, 10], negative: true, requireScaleFamily: true },
];

export const COORDINATE_SCALE_TOTAL = LEVELS.length;

// --- generation -------------------------------------------------------------

function pickTargetTick(level: LevelSpec): Point | null {
  const pool = tickPool(level.negative).filter((n) => (level.evenTicks ? n % 2 === 0 : true));
  if (pool.length === 0) return null;

  if (level.kind === 'axisValue') {
    const tick = randomOf(pool);
    return Math.random() < 0.5 ? { x: tick, y: 0 } : { x: 0, y: tick };
  }

  const x = randomOf(pool);
  const y = randomOf(pool);
  if (x === y) return null;
  if (level.negative && x > 0 && y > 0) return null;
  return { x, y };
}

function pickAnchor(level: LevelSpec, used: Point[]): ScaleAnchor | null {
  const pool = tickPool(false).filter((n) => (level.halfAnchor ? n % 2 === 1 : true));
  const signs = level.negative ? [1, -1] : [1];
  const x = randomOf(pool) * randomOf(signs);
  const y = randomOf(pool) * randomOf(signs);
  const tick = { x, y };
  // A zero coordinate would leave that axis' scale unknown.
  if (tick.x === 0 || tick.y === 0) return null;
  if (used.some((point) => samePoint(point, tick))) return null;
  return { tick, label: ANCHOR_LABEL };
}

function tryBuildChallenge(level: LevelSpec): ScaleChallenge | null {
  const scale = randomOf(level.scales);
  const targetTick = pickTargetTick(level);
  if (!targetTick) return null;

  const onAxis = level.kind === 'axisValue' ? (targetTick.y === 0 ? 'x' : 'y') : null;
  const wanted = 3;
  const minimum = level.kind === 'axisValue' ? 2 : 3;

  const candidates = mistakeCandidates(targetTick, scale, onAxis);
  if (candidates.length < minimum) return null;

  const distractors = chooseDistractors(candidates, wanted);
  if (distractors.length < minimum) return null;
  if (level.requireScaleFamily && !distractors.some((d) => d.kind === 'scaleAsOne' || d.kind === 'wrongScale')) {
    return null;
  }

  const optionTicks = [targetTick, ...distractors.map((d) => d.tick)];

  let anchor: ScaleAnchor | null = null;
  if (level.evidence === 'anchor') {
    anchor = pickAnchor(level, optionTicks);
    if (!anchor) return null;
  }

  let labeledTicks: { x: number[]; y: number[] };
  if (level.evidence === 'anchor') {
    labeledTicks = { x: [], y: [] };
  } else if (level.kind === 'axisValue') {
    const axis = onAxis === 'y' ? 'y' : 'x';
    // Labelling any option's tick would give the answer away for free.
    const exclude = optionTicks.map((tick) => tick[axis]);
    const labels = buildLabeledTicks(level.negative, exclude, []);
    if (!labels) return null;
    labeledTicks = axis === 'x' ? { x: labels, y: [] } : { x: [], y: labels };
  } else {
    const xLabels = buildLabeledTicks(level.negative, [], [targetTick.x]);
    const yLabels = buildLabeledTicks(level.negative, [], [targetTick.y]);
    if (!xLabels || !yLabels) return null;
    labeledTicks = { x: xLabels, y: yLabels };
  }

  const referenceAxis: 'x' | 'y' = level.evidence === 'anchor' ? 'x' : onAxis === 'y' ? 'y' : 'x';
  const referenceTick = anchor
    ? anchor.tick[referenceAxis]
    : [...labeledTicks[referenceAxis]].sort((a, b) => Math.abs(a) - Math.abs(b))[0];
  if (referenceTick === undefined || referenceTick === 0) return null;

  const options: ScaleOption[] = shuffle([
    { tick: targetTick, kind: 'correct' as const },
    ...distractors.map((d) => ({ tick: d.tick, kind: d.kind })),
  ]).map((entry, index) => ({
    id: `${level.id}-opt-${index}`,
    tick: entry.tick,
    label: OPTION_LABELS[index],
    kind: entry.kind,
  }));

  const correctOption = options.find((option) => option.kind === 'correct');
  if (!correctOption) return null;

  const challenge: ScaleChallenge = {
    id: level.id,
    kind: level.kind,
    evidence: level.evidence,
    scale,
    labeledTicks,
    anchor,
    axis: onAxis,
    targetTick,
    targetValue: { x: valueAt(targetTick.x, scale), y: valueAt(targetTick.y, scale) },
    targetLabel: TARGET_LABEL,
    reference: { axis: referenceAxis, fromTick: 0, toTick: referenceTick },
    options,
    correctOptionId: correctOption.id,
  };

  assertChallengeIsSound(challenge);
  return challenge;
}

// --- invariants -------------------------------------------------------------

function fail(challenge: ScaleChallenge, reason: string): never {
  throw new Error(`Invalid coordinate-scale question (${challenge.id}): ${reason}`);
}

/**
 * Refuses to hand out a question that is not uniquely solvable from what the
 * student can actually see, or whose wrong answers are not real misconceptions.
 */
export function assertChallengeIsSound(challenge: ScaleChallenge): void {
  const { scale, targetTick, targetValue, options, anchor, labeledTicks } = challenge;

  if (!(scale > 0)) fail(challenge, 'scale must be positive');
  if (!SUPPORTED_SCALES.includes(scale)) fail(challenge, `scale ${scale} is not supported`);
  if (!isTickPoint(targetTick)) fail(challenge, 'target is outside the visible grid');
  if (targetValue.x !== valueAt(targetTick.x, scale) || targetValue.y !== valueAt(targetTick.y, scale)) {
    fail(challenge, 'target value does not match its grid position');
  }

  if (options.length < 3 || options.length > 4) fail(challenge, 'a question needs 3 or 4 candidates');
  if (new Set(options.map((option) => pointKey(option.tick))).size !== options.length) {
    fail(challenge, 'two candidates share a position');
  }
  if (new Set(options.map((option) => option.id)).size !== options.length) fail(challenge, 'duplicate candidate id');
  for (const option of options) {
    if (!isTickPoint(option.tick)) fail(challenge, 'a candidate is outside the visible grid');
  }

  const correct = options.filter((option) => option.kind === 'correct');
  if (correct.length !== 1) fail(challenge, 'exactly one candidate must be correct');
  if (!samePoint(correct[0].tick, targetTick)) fail(challenge, 'the correct candidate is not on the target');
  if (correct[0].id !== challenge.correctOptionId) fail(challenge, 'correctOptionId points at the wrong candidate');

  for (const option of options) {
    if (option.kind === 'correct') continue;
    if (!isNamedMistake(option, challenge)) fail(challenge, `candidate ${option.label} is not a recognised mistake`);
  }

  if (anchor) {
    if (!isTickPoint(anchor.tick)) fail(challenge, 'the anchor point is outside the visible grid');
    if (anchor.tick.x === 0 || anchor.tick.y === 0) fail(challenge, 'the anchor must be off both axes to fix the scale');
    if (options.some((option) => samePoint(option.tick, anchor.tick))) fail(challenge, 'a candidate sits on the anchor');
  }

  for (const axis of ['x', 'y'] as const) {
    const ticks = labeledTicks[axis];
    if (new Set(ticks).size !== ticks.length) fail(challenge, 'duplicate axis label');
    for (const tick of ticks) {
      if (!isTickIndex(tick) || tick === 0) fail(challenge, 'invalid labelled tick');
    }
  }

  if (challenge.reference.fromTick !== 0 || challenge.reference.toTick === 0) {
    fail(challenge, 'the scale reference must span the origin and one other tick');
  }
  const referenceKnown =
    labeledTicks[challenge.reference.axis].includes(challenge.reference.toTick) ||
    (anchor !== null && anchor.tick[challenge.reference.axis] === challenge.reference.toTick);
  if (!referenceKnown) fail(challenge, 'the scale reference is not visible to the student');

  for (const axis of axesInScope(challenge)) {
    assertAxisScaleIsUnique(challenge, axis);
  }
}

/** Axes the student must actually read to answer. */
function axesInScope(challenge: ScaleChallenge): ('x' | 'y')[] {
  if (challenge.kind === 'axisValue') return [challenge.axis === 'y' ? 'y' : 'x'];
  return ['x', 'y'];
}

/**
 * The visible evidence on one axis must pin the scale down to a single value.
 * The origin always counts as a known point, so one more known tick is enough —
 * and every known tick must agree with the scale the question was built on.
 */
function assertAxisScaleIsUnique(challenge: ScaleChallenge, axis: 'x' | 'y'): void {
  const known: { tick: number; value: number }[] = [{ tick: 0, value: 0 }];
  for (const tick of challenge.labeledTicks[axis]) known.push({ tick, value: valueAt(tick, challenge.scale) });
  if (challenge.anchor) {
    known.push({ tick: challenge.anchor.tick[axis], value: valueAt(challenge.anchor.tick[axis], challenge.scale) });
  }

  if (new Set(known.map((entry) => entry.tick)).size < 2) {
    fail(challenge, `the ${axis} axis does not show enough to work the scale out`);
  }
  for (const entry of known) {
    if (entry.value !== valueAt(entry.tick, challenge.scale)) fail(challenge, `inconsistent ${axis} axis label`);
  }
  for (const a of known) {
    for (const b of known) {
      if (a.tick === b.tick) continue;
      const derived = (b.value - a.value) / (b.tick - a.tick);
      if (derived !== challenge.scale) fail(challenge, `the ${axis} axis allows more than one scale`);
    }
  }
}

function isNamedMistake(option: ScaleOption, challenge: ScaleChallenge): boolean {
  const { targetTick, targetValue, scale } = challenge;
  switch (option.kind) {
    case 'scaleAsOne':
      return option.tick.x === targetValue.x && option.tick.y === targetValue.y;
    case 'wrongScale':
      return SUPPORTED_SCALES.some(
        (other) =>
          other !== scale && other !== 1 && option.tick.x === targetValue.x / other && option.tick.y === targetValue.y / other,
      );
    case 'swappedXY':
      return option.tick.x === targetTick.y && option.tick.y === targetTick.x;
    case 'signError':
      return (
        (option.tick.x === -targetTick.x && option.tick.y === targetTick.y) ||
        (option.tick.x === targetTick.x && option.tick.y === -targetTick.y)
      );
    default:
      return false;
  }
}

// --- public API -------------------------------------------------------------

function buildChallenge(level: LevelSpec, taken: Set<string>): ScaleChallenge {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const challenge = tryBuildChallenge(level);
    if (!challenge) continue;
    const signature = questionSignature(challenge);
    if (taken.has(signature)) continue;
    taken.add(signature);
    return challenge;
  }
  throw new Error(`Could not build a sound coordinate-scale question for level ${level.id}`);
}

export function questionSignature(challenge: ScaleChallenge): string {
  return [challenge.kind, challenge.evidence, challenge.scale, challenge.targetTick.x, challenge.targetTick.y].join('|');
}

/** One full session: eight questions, ordered from simplest to hardest. */
export function buildCoordinateScaleChallenges(): ScaleChallenge[] {
  const taken = new Set<string>();
  return LEVELS.map((level) => buildChallenge(level, taken));
}
