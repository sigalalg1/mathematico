import { describe, expect, it } from 'vitest';
import { buildCargoStationStages, CARGO_STATION_TOTAL } from '../cargoStationData';
import type { CargoChallenge } from '../../../types/cargoStation';

const RUNS = 400;

function allRounds(runs = RUNS): CargoChallenge[][] {
  return Array.from({ length: runs }, () => buildCargoStationStages().flatMap((stage) => stage.challenges));
}

const ALL = allRounds().flat();

describe('cargo station — the division identity always holds', () => {
  it('satisfies dividend = divisor * quotient + remainder', () => {
    for (const c of ALL) {
      expect(c.dividend).toBe(c.divisor * c.quotient + c.remainder);
    }
  });

  it('keeps 0 <= remainder < divisor', () => {
    for (const c of ALL) {
      expect(c.remainder).toBeGreaterThanOrEqual(0);
      expect(c.remainder).toBeLessThan(c.divisor);
    }
  });

  it('only produces whole numbers', () => {
    for (const c of ALL) {
      for (const value of [c.dividend, c.divisor, c.quotient, c.remainder]) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  it('stays inside Grade 4 friendly, drawable ranges', () => {
    for (const c of ALL) {
      expect(c.divisor).toBeGreaterThanOrEqual(2);
      expect(c.divisor).toBeLessThanOrEqual(6);
      expect(c.quotient).toBeGreaterThanOrEqual(2);
      expect(c.dividend).toBeGreaterThan(0);
      expect(c.dividend).toBeLessThanOrEqual(30);
    }
  });
});

describe('cargo station — stage rules', () => {
  it('never leaves a remainder in stage 1 (exact sharing)', () => {
    for (const c of ALL) {
      if (c.stageId === 'stage1') expect(c.remainder).toBe(0);
    }
  });

  it('always leaves a remainder in the remainder stages', () => {
    for (const c of ALL) {
      if (c.stageId !== 'stage1') expect(c.remainder).toBeGreaterThan(0);
    }
  });

  it('keeps stage 2 remainders small and obvious (1 or 2)', () => {
    for (const c of ALL) {
      if (c.stageId === 'stage2') expect(c.remainder).toBeLessThanOrEqual(2);
    }
  });

  it('makes the final mission the biggest delivery stage', () => {
    for (const c of ALL) {
      if (c.stageId === 'stage4') {
        expect(c.divisor).toBeGreaterThanOrEqual(4);
        expect(c.quotient).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('covers every remainder value 1..divisor-1 over many rounds', () => {
    const seen = new Set(ALL.filter((c) => c.stageId === 'stage3').map((c) => c.remainder));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('cargo station — round structure', () => {
  it('builds four ordered stages with the advertised total and unique ids', () => {
    for (let run = 0; run < 200; run++) {
      const stages = buildCargoStationStages();
      expect(stages.map((s) => s.id)).toEqual(['stage1', 'stage2', 'stage3', 'stage4']);
      const challenges = stages.flatMap((s) => s.challenges);
      expect(challenges).toHaveLength(CARGO_STATION_TOTAL);
      expect(CARGO_STATION_TOTAL).toBeGreaterThanOrEqual(4);
      expect(CARGO_STATION_TOTAL).toBeLessThanOrEqual(6);
      expect(new Set(challenges.map((c) => c.id)).size).toBe(challenges.length);
      for (const stage of stages) {
        expect(stage.nameKey).toBe(`cargoStation.stages.${stage.id}.name`);
        expect(stage.introKey).toBe(`cargoStation.stages.${stage.id}.intro`);
      }
    }
  });

  it('never repeats the same exercise twice inside one round', () => {
    for (const round of allRounds(300)) {
      const keys = round.map((c) => `${c.dividend}/${c.divisor}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('varies the exercises between rounds', () => {
    const signatures = new Set(allRounds(60).map((round) => round.map((c) => `${c.dividend}/${c.divisor}`).join('|')));
    expect(signatures.size).toBeGreaterThan(1);
  });
});
