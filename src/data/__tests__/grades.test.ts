import { describe, expect, it } from 'vitest';
import { grades } from '../grades';
import { gradeHasContent, topics } from '../topics';
import { coordinateSystemGames, signedNumbersGames } from '../games';

describe('grade visibility is derived from actual content, not a hardcoded list', () => {
  it('enables every grade that has at least one enabled topic with a playable game', () => {
    for (const grade of grades) {
      expect(grade.enabled).toBe(gradeHasContent(grade.id));
    }
  });

  it('keeps every known grade id in the list, whether or not it currently has content', () => {
    expect(grades.map((g) => g.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('hides a grade with no enabled topics at all (e.g. Grade 1, which has none)', () => {
    expect(topics.some((topic) => topic.gradeId === 1)).toBe(false);
    expect(gradeHasContent(1)).toBe(false);
  });

  it('hides a grade whose only topics are disabled placeholders (Grade 7 fractions/geometry/algebra are all disabled)', () => {
    const disabledOnly = topics.filter((t) => t.gradeId === 7 && !t.enabled);
    expect(disabledOnly.length).toBeGreaterThan(0);
    // Grade 7 is still visible overall because of coordinateSystem/signedNumbers,
    // proving a grade needs only ONE real topic, not all of them.
    expect(gradeHasContent(7)).toBe(true);
  });

  it('shows Grade 7, which has real Coordinate System and Signed Numbers activities', () => {
    expect(coordinateSystemGames.length).toBeGreaterThan(0);
    expect(signedNumbersGames.length).toBeGreaterThan(0);
    expect(gradeHasContent(7)).toBe(true);
  });

  it('would not treat an enabled topic with an empty game list as real content on its own', () => {
    // divisionWithRemainder/simpleFractions are enabled topics whose listing
    // arrays are currently empty (superseded by fractionsPart1/other topics).
    // Grade 4 must still be visible only because OTHER topics have real games.
    const emptyTopics = topics.filter((t) => t.gradeId === 4 && (t.id === 'divisionWithRemainder' || t.id === 'simpleFractions'));
    expect(emptyTopics.every((t) => t.enabled)).toBe(true);
    expect(gradeHasContent(4)).toBe(true);
  });
});
