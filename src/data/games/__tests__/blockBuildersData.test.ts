import { describe, expect, it } from 'vitest';
import {
  BLOCK_BUILDERS_FACTOR_MAX,
  BLOCK_BUILDERS_FACTOR_MIN,
  BLOCK_BUILDERS_MISSION_COUNT,
  buildBlockBuildersSession,
  correctBlockAnswer,
  evaluateBlockAnswer,
  isBlockAnswerCorrect,
  resolveMissingFactor,
} from '../blockBuildersData';

function seededRandom(seed = 42) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('Block Builders challenge generation', () => {
  it('creates a deterministic, valid nine-mission progression in the configured range', () => {
    const first = buildBlockBuildersSession(seededRandom());
    const second = buildBlockBuildersSession(seededRandom());

    expect(first).toEqual(second);
    expect(first).toHaveLength(BLOCK_BUILDERS_MISSION_COUNT);
    expect(first.map((mission) => mission.kind)).toEqual([
      'buildArray',
      'matchBuild',
      'completeBuild',
      'buildArray',
      'matchBuild',
      'missingFactor',
      'quickBuild',
      'completeBuild',
      'quickBuild',
    ]);

    for (const mission of first) {
      expect(mission.rows).toBeGreaterThanOrEqual(BLOCK_BUILDERS_FACTOR_MIN);
      expect(mission.columns).toBeGreaterThanOrEqual(BLOCK_BUILDERS_FACTOR_MIN);
      expect(mission.rows).toBeLessThanOrEqual(BLOCK_BUILDERS_FACTOR_MAX);
      expect(mission.columns).toBeLessThanOrEqual(BLOCK_BUILDERS_FACTOR_MAX);
      expect(mission.product).toBe(mission.rows * mission.columns);
      expect(mission.choices).toContain(Number(correctBlockAnswer(mission)) || mission.product);
    }
  });

  it('prevents duplicate orientations and immediate unplanned reverse pairs', () => {
    const session = buildBlockBuildersSession(seededRandom(7));
    const keys = session.map(({ rows, columns }) => `${rows}x${columns}`);
    expect(new Set(keys)).toHaveLength(session.length);
    session.slice(1).forEach((mission, index) => {
      const previous = session[index];
      expect(`${mission.rows}x${mission.columns}`).not.toBe(`${previous.columns}x${previous.rows}`);
    });
  });

  it('includes the reverse orientation as an intentional, equal-product structure distractor', () => {
    const mission = buildBlockBuildersSession(seededRandom(4)).find((item) => item.kind === 'matchBuild')!;
    const reverse = mission.buildOptions!.find((option) => option.rows === mission.columns && option.columns === mission.rows);

    expect(reverse).toBeDefined();
    expect(reverse!.rows * reverse!.columns).toBe(mission.product);
    expect(evaluateBlockAnswer(mission, { value: reverse!.id })).toBe('reversed');
  });

  it('resolves missing factors and validates answers', () => {
    expect(resolveMissingFactor(56, 7)).toBe(8);
    const mission = buildBlockBuildersSession(seededRandom(12)).find((item) => item.kind === 'missingFactor')!;
    expect(isBlockAnswerCorrect(mission, { value: String(mission.rows) })).toBe(true);
    expect(isBlockAnswerCorrect(mission, { value: String(mission.rows - 1) })).toBe(false);
  });
});
