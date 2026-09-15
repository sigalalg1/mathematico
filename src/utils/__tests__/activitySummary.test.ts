import { describe, expect, it } from 'vitest';
import { topics } from '../../data/topics';
import type { GameSession } from '../../types/activity';
import {
  computeTotals,
  derivePracticeStatus,
  filterByRange,
  groupByTopic,
  pickInsight,
  toEntries,
} from '../activitySummary';

const NOW = new Date('2026-09-15T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const topicPaths = new Map(topics.map((topic) => [topic.id, topic.path]));

function daysAgo(days: number, hour = 10): string {
  const date = new Date(NOW.getTime() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** Builds a session in exactly the shape the tracking stores return. */
function session(overrides: Partial<GameSession> & { id: string; gameId: string }): GameSession {
  return {
    userId: null,
    startedAt: overrides.completedAt ?? daysAgo(0),
    completedAt: daysAgo(0),
    questionsCount: 5,
    correctCount: 4,
    mistakes: [],
    ...overrides,
  };
}

describe('toEntries', () => {
  it('keeps only sessions the tracking layer marked completed', () => {
    const entries = toEntries([
      session({ id: 'a', gameId: 'cargoStation' }),
      session({ id: 'b', gameId: 'cargoStation', completedAt: null }),
    ]);
    expect(entries.map((entry) => entry.session.id)).toEqual(['a']);
  });

  it('drops sessions with an unparsable completion date instead of rendering NaN', () => {
    const entries = toEntries([session({ id: 'a', gameId: 'cargoStation', completedAt: 'not-a-date' })]);
    expect(entries).toEqual([]);
  });

  it('orders newest first even when the backend returned them out of order', () => {
    const entries = toEntries([
      session({ id: 'old', gameId: 'cargoStation', completedAt: daysAgo(5) }),
      session({ id: 'new', gameId: 'cargoStation', completedAt: daysAgo(1) }),
      session({ id: 'middle', gameId: 'cargoStation', completedAt: daysAgo(3) }),
    ]);
    expect(entries.map((entry) => entry.session.id)).toEqual(['new', 'middle', 'old']);
  });

  it('resolves presentation metadata for grade 4 and grade 7 games alike', () => {
    const entries = toEntries([
      session({ id: 'a', gameId: 'fractionBalloons' }),
      session({ id: 'b', gameId: 'hitTheTarget' }),
    ]);
    expect(entries[0].game).toMatchObject({ gradeId: 4, topicId: 'simpleFractions', nameKey: 'fractionBalloons.gameName' });
    expect(entries[1].game).toMatchObject({ gradeId: 7, topicId: 'coordinateSystem', nameKey: 'games.hitTheTarget.name' });
  });

  it('falls back to a friendly label for a game id no longer in the registry', () => {
    const [entry] = toEntries([session({ id: 'a', gameId: 'someRetiredGame' })]);
    expect(entry.game.nameKey).toBe('activity.unknownGame');
    expect(entry.game.path).toBeUndefined();
  });
});

describe('computeTotals', () => {
  it('sums sessions, questions and correct answers over completed sessions only', () => {
    const totals = computeTotals(
      toEntries([
        session({ id: 'a', gameId: 'cargoStation', questionsCount: 6, correctCount: 5 }),
        session({ id: 'b', gameId: 'hitTheTarget', questionsCount: 4, correctCount: 1 }),
        session({ id: 'c', gameId: 'hitTheTarget', completedAt: null, questionsCount: 99, correctCount: 99 }),
      ]),
    );
    expect(totals).toMatchObject({ sessions: 2, questions: 10, correct: 6 });
  });

  it('counts distinct calendar days as practice days', () => {
    const totals = computeTotals(
      toEntries([
        session({ id: 'a', gameId: 'cargoStation', completedAt: daysAgo(0, 9) }),
        session({ id: 'b', gameId: 'cargoStation', completedAt: daysAgo(0, 18) }),
        session({ id: 'c', gameId: 'cargoStation', completedAt: daysAgo(2) }),
      ]),
    );
    expect(totals.sessions).toBe(3);
    expect(totals.practiceDays).toBe(2);
  });

  it('returns all zeroes for no activity', () => {
    expect(computeTotals([])).toEqual({ sessions: 0, questions: 0, correct: 0, practiceDays: 0 });
  });
});

describe('filterByRange', () => {
  const entries = toEntries([
    session({ id: 'today', gameId: 'cargoStation', completedAt: daysAgo(0) }),
    session({ id: 'thisMonth', gameId: 'cargoStation', completedAt: daysAgo(10) }),
    session({ id: 'longAgo', gameId: 'cargoStation', completedAt: daysAgo(60) }),
  ]);

  it('is a no-op for "all"', () => {
    expect(filterByRange(entries, 'all', NOW)).toHaveLength(3);
  });

  it('keeps only the last 7 days for "week"', () => {
    expect(filterByRange(entries, 'week', NOW).map((entry) => entry.session.id)).toEqual(['today']);
  });

  it('keeps only the last 30 days for "month"', () => {
    expect(filterByRange(entries, 'month', NOW).map((entry) => entry.session.id)).toEqual(['today', 'thisMonth']);
  });
});

describe('derivePracticeStatus', () => {
  const base = { sessions: 3, questions: 20, correct: 14, lastPlayedAt: new Date(NOW.getTime() - DAY) };

  it('marks a topic untouched for two weeks as resting, whatever the numbers', () => {
    expect(
      derivePracticeStatus({ ...base, sessions: 20, lastPlayedAt: new Date(NOW.getTime() - 20 * DAY) }, NOW),
    ).toBe('restingTopic');
  });

  it('calls a single session a first try', () => {
    expect(derivePracticeStatus({ ...base, sessions: 1 }, NOW)).toBe('firstTry');
  });

  it('suggests more practice below a 60% correct rate', () => {
    expect(derivePracticeStatus({ ...base, questions: 10, correct: 4 }, NOW)).toBe('morePractice');
  });

  it('says going great at or above 80%', () => {
    expect(derivePracticeStatus({ ...base, questions: 10, correct: 9 }, NOW)).toBe('goingGreat');
  });

  it('never claims mastery — the strongest label is still about practice', () => {
    const labels = new Set([
      derivePracticeStatus({ ...base, sessions: 30, questions: 300, correct: 300 }, NOW),
      derivePracticeStatus({ ...base, sessions: 6, questions: 30, correct: 21 }, NOW),
    ]);
    expect(labels.has('goingGreat')).toBe(true);
    expect([...labels]).not.toContain('mastered');
  });

  it('reports lots of practice when accuracy is mid-band but sessions are many', () => {
    expect(derivePracticeStatus({ ...base, sessions: 8, questions: 100, correct: 70 }, NOW)).toBe('lotsOfPractice');
  });

  it('falls back to getting started for a couple of short sessions', () => {
    expect(derivePracticeStatus({ ...base, sessions: 2, questions: 2, correct: 1 }, NOW)).toBe('gettingStarted');
  });
});

describe('groupByTopic', () => {
  it('groups mixed grade 4 and grade 7 activity by grade and topic', () => {
    const grades = groupByTopic(
      toEntries([
        session({ id: 'a', gameId: 'fractionBalloons', questionsCount: 5, correctCount: 5 }),
        session({ id: 'b', gameId: 'fractionFactory', questionsCount: 5, correctCount: 4 }),
        session({ id: 'c', gameId: 'cargoStation', questionsCount: 3, correctCount: 3 }),
        session({ id: 'd', gameId: 'hitTheTarget', questionsCount: 4, correctCount: 2 }),
      ]),
      NOW,
      topicPaths,
    );

    expect(grades.map((grade) => grade.gradeId)).toEqual([4, 7]);
    const fractions = grades[0].topics.find((topic) => topic.topicId === 'simpleFractions')!;
    expect(fractions).toMatchObject({ sessions: 2, questions: 10, correct: 9, gradeId: 4 });
    expect(fractions.path).toBe('/grade/4/simple-fractions');
    expect(fractions.icons.length).toBe(2);
    expect(grades[1].topics).toHaveLength(1);
    expect(grades[1].topics[0].topicId).toBe('coordinateSystem');
  });

  it('skips sessions whose game is no longer in the registry', () => {
    const grades = groupByTopic(toEntries([session({ id: 'a', gameId: 'ghostGame' })]), NOW, topicPaths);
    expect(grades).toEqual([]);
  });
});

describe('pickInsight', () => {
  function grades(sessions: GameSession[]) {
    return groupByTopic(toEntries(sessions), NOW, topicPaths);
  }

  it('returns nothing when there is no activity', () => {
    expect(pickInsight([], NOW)).toBeNull();
  });

  it('gently invites the child back to a topic untouched for a fortnight', () => {
    const insight = pickInsight(
      grades([
        session({ id: 'a', gameId: 'cargoStation', completedAt: daysAgo(30) }),
        session({ id: 'b', gameId: 'hitTheTarget', completedAt: daysAgo(1) }),
      ]),
      NOW,
    );
    expect(insight).toMatchObject({ kind: 'comeBack', topicId: 'divisionWithRemainder', path: '/grade/4/division-with-remainder' });
  });

  it('offers a fresh challenge in a heavily practised, high-accuracy topic', () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      session({ id: `s${index}`, gameId: 'hitTheTarget', questionsCount: 5, correctCount: 5, completedAt: daysAgo(index % 5) }),
    );
    expect(pickInsight(grades(many), NOW)).toMatchObject({ kind: 'freshChallenge', topicId: 'coordinateSystem' });
  });

  it('otherwise celebrates the most-practised topic of the week', () => {
    const insight = pickInsight(
      grades([
        session({ id: 'a', gameId: 'fractionBalloons', completedAt: daysAgo(1), questionsCount: 5, correctCount: 4 }),
        session({ id: 'b', gameId: 'fractionFactory', completedAt: daysAgo(2), questionsCount: 5, correctCount: 4 }),
        session({ id: 'c', gameId: 'hitTheTarget', completedAt: daysAgo(3), questionsCount: 5, correctCount: 4 }),
      ]),
      NOW,
    );
    expect(insight).toMatchObject({ kind: 'mostPracticed', topicId: 'simpleFractions' });
  });

  it('is deterministic — the same data always yields the same insight', () => {
    const data = [session({ id: 'a', gameId: 'cargoStation', completedAt: daysAgo(2) })];
    expect(pickInsight(grades(data), NOW)).toEqual(pickInsight(grades(data), NOW));
  });
});
