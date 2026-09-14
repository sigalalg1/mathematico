import type { BlockAnswer, BlockFeedback, BlockMission, BlockMissionKind, BuildOption } from '../../types/blockBuilders';
import { shuffle } from '../../utils/shuffle';

export const BLOCK_BUILDERS_MISSION_COUNT = 9;
export const BLOCK_BUILDERS_FACTOR_MIN = 2;
export const BLOCK_BUILDERS_FACTOR_MAX = 10;

type RandomSource = () => number;

const MISSION_KINDS: BlockMissionKind[] = [
  'buildArray',
  'matchBuild',
  'completeBuild',
  'buildArray',
  'matchBuild',
  'missingFactor',
  'quickBuild',
  'completeBuild',
  'quickBuild',
];
const EARLY_FACTORS = [2, 3, 4, 5, 10];
const LATE_FACTORS = [6, 7, 8, 9];

function pick<T>(values: T[], random: RandomSource): T {
  return values[Math.floor(random() * values.length)];
}

function numberChoices(answer: number, random: RandomSource, min = 1, max = 81): number[] {
  const values = new Set([answer]);
  for (const offset of shuffle([-2, -1, 1, 2, -3, 3], random)) {
    const value = answer + offset;
    if (value >= min && value <= max) values.add(value);
    if (values.size === 4) break;
  }
  return shuffle([...values], random);
}

function buildOptions(rows: number, columns: number, random: RandomSource): BuildOption[] {
  const candidates: BuildOption[] = [
    { id: `${rows}x${columns}`, rows, columns },
    { id: `${columns}x${rows}`, rows: columns, columns: rows },
    { id: `${rows + 1}x${columns}`, rows: rows + 1, columns },
    { id: `${rows}x${Math.max(2, columns - 1)}`, rows, columns: Math.max(2, columns - 1) },
  ];
  return shuffle(candidates.filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index), random).slice(0, 3);
}

function pairFor(index: number, used: Set<string>, previous: [number, number] | undefined, avoidSquare: boolean, random: RandomSource): [number, number] {
  const rows = index < 5 ? EARLY_FACTORS : LATE_FACTORS;
  const columns = index < 5 ? EARLY_FACTORS : [...EARLY_FACTORS, ...LATE_FACTORS];
  const candidates = rows.flatMap((row) => columns.map((column): [number, number] => [row, column])).filter(([row, column]) => {
    if (used.has(`${row}x${column}`)) return false;
    if (avoidSquare && row === column) return false;
    return !previous || `${row}x${column}` !== `${previous[1]}x${previous[0]}`;
  });
  return pick(candidates, random);
}

/**
 * Creates an ordered conceptual-to-recall session. Randomness is injected so
 * tests and future games can reproduce sessions without random calls in UI.
 */
export function buildBlockBuildersSession(random: RandomSource = Math.random): BlockMission[] {
  const missions: BlockMission[] = [];
  const used = new Set<string>();

  MISSION_KINDS.forEach((kind, index) => {
    const pair = pairFor(
      index,
      used,
      missions.length ? [missions.at(-1)!.rows, missions.at(-1)!.columns] : undefined,
      kind === 'matchBuild',
      random,
    );
    const [rows, columns] = pair;
    used.add(`${rows}x${columns}`);
    const product = rows * columns;
    const missingCount = kind === 'completeBuild' ? Math.max(1, Math.min(columns, Math.floor(columns / 2) + 1)) : undefined;
    const answer =
      kind === 'missingFactor'
        ? rows
        : kind === 'completeBuild'
          ? missingCount!
          : product;

    missions.push({
      id: `block-builders-${index}-${rows}x${columns}`,
      kind,
      rows,
      columns,
      product,
      choices: numberChoices(answer, random, 1, kind === 'missingFactor' ? 10 : 81),
      buildOptions: kind === 'matchBuild' ? buildOptions(rows, columns, random) : undefined,
      missingCount,
      intentionalReverse: kind === 'matchBuild',
    });
  });
  return missions;
}

export function correctBlockAnswer(mission: BlockMission): string {
  if (mission.kind === 'buildArray') return `${mission.rows}x${mission.columns}`;
  if (mission.kind === 'matchBuild') return `${mission.rows}x${mission.columns}`;
  if (mission.kind === 'missingFactor') return String(mission.rows);
  if (mission.kind === 'completeBuild') return String(mission.missingCount);
  return String(mission.product);
}

export function isBlockAnswerCorrect(mission: BlockMission, answer: BlockAnswer): boolean {
  return answer.value === correctBlockAnswer(mission);
}

export function evaluateBlockAnswer(mission: BlockMission, answer: BlockAnswer): BlockFeedback {
  if (isBlockAnswerCorrect(mission, answer)) return 'correct';
  if (mission.kind === 'buildArray') {
    const [rows, columns] = answer.value.split('x').map(Number);
    return rows * columns < mission.product ? 'tooFew' : 'tooMany';
  }
  if (mission.kind === 'matchBuild') {
    return answer.value === `${mission.columns}x${mission.rows}` ? 'reversed' : 'different';
  }
  const selected = Number(answer.value);
  const correct = Number(correctBlockAnswer(mission));
  return selected < correct ? 'tooFew' : 'tooMany';
}

export function resolveMissingFactor(product: number, knownFactor: number): number {
  return product / knownFactor;
}
