import type { CargoChallenge } from '../../types/cargoStation';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type RemainderMode = 'none' | 'small' | 'any';

interface ChallengeSpec {
  divisorMin: number;
  divisorMax: number;
  quotientMin: number;
  quotientMax: number;
  remainderMode: RemainderMode;
}

/**
 * Grade 4 ranges are deliberately small: every challenge has to be laid out as
 * physical crates on screen, so the dividend stays under ~30 and the number of
 * loader robots stays between 2 and 6.
 */
const SPECS: Record<string, ChallengeSpec> = {
  // Stage 1 — exact division, introduces equal sharing with nothing left over.
  stage1: { divisorMin: 2, divisorMax: 4, quotientMin: 2, quotientMax: 4, remainderMode: 'none' },
  // Stage 2 — small, obvious remainders (1 or 2 crates left).
  stage2: { divisorMin: 3, divisorMax: 5, quotientMin: 2, quotientMax: 4, remainderMode: 'small' },
  // Stage 3 — mixed division with any legal remainder.
  stage3: { divisorMin: 3, divisorMax: 6, quotientMin: 2, quotientMax: 4, remainderMode: 'any' },
  // Stage 4 — the final mission: the biggest delivery of the round.
  stage4: { divisorMin: 4, divisorMax: 6, quotientMin: 3, quotientMax: 4, remainderMode: 'any' },
};

function pickRemainder(mode: RemainderMode, divisor: number): number {
  if (mode === 'none') return 0;
  if (mode === 'small') return randomInt(1, Math.min(2, divisor - 1));
  return randomInt(1, divisor - 1);
}

function buildChallenge(id: string, stageId: string, spec: ChallengeSpec): CargoChallenge {
  const divisor = randomInt(spec.divisorMin, spec.divisorMax);
  const quotient = randomInt(spec.quotientMin, spec.quotientMax);
  const remainder = pickRemainder(spec.remainderMode, divisor);
  return { id, stageId, divisor, quotient, remainder, dividend: divisor * quotient + remainder };
}

function challengeKey(challenge: CargoChallenge): string {
  return `${challenge.dividend}/${challenge.divisor}`;
}

/** Builds a challenge while avoiding an exact repeat of one already in the round. */
function buildUniqueChallenge(id: string, stageId: string, spec: ChallengeSpec, existing: CargoChallenge[]): CargoChallenge {
  const usedKeys = new Set(existing.map(challengeKey));
  let challenge: CargoChallenge;
  let guard = 0;
  do {
    challenge = buildChallenge(id, stageId, spec);
    guard += 1;
  } while (guard < 50 && usedKeys.has(challengeKey(challenge)));
  return challenge;
}

export interface CargoStageDef {
  id: string;
  nameKey: string;
  introKey: string;
  challenges: CargoChallenge[];
}

const STAGE_SIZES: Array<{ id: string; size: number }> = [
  { id: 'stage1', size: 2 },
  { id: 'stage2', size: 2 },
  { id: 'stage3', size: 1 },
  { id: 'stage4', size: 1 },
];

export function buildCargoStationStages(): CargoStageDef[] {
  const produced: CargoChallenge[] = [];

  return STAGE_SIZES.map(({ id, size }) => {
    const challenges: CargoChallenge[] = [];
    for (let i = 0; i < size; i++) {
      const challenge = buildUniqueChallenge(`${id}-${i}`, id, SPECS[id], produced);
      challenges.push(challenge);
      produced.push(challenge);
    }
    return {
      id,
      nameKey: `cargoStation.stages.${id}.name`,
      introKey: `cargoStation.stages.${id}.intro`,
      challenges,
    };
  });
}

export const CARGO_STATION_TOTAL = STAGE_SIZES.reduce((sum, stage) => sum + stage.size, 0);
