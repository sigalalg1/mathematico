import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Geo4RelationsPage } from '../Geo4RelationsPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

// At "advanced" difficulty, Group 3's kind pool starts with
// 'constructDiagonal' (see KIND_POOL in `grade4GeoRelationsData.ts`), so
// question 1 is always the diagonal-construction interaction.
function startAdvancedConstruct() {
  renderWithProviders(<Geo4RelationsPage />);
  fireEvent.click(screen.getByTestId('geo-lesson-skip'));
  fireEvent.click(screen.getByTestId('tr-difficulty-advanced'));
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Sides, Vertices & Diagonals — construct-a-diagonal interaction', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    vi.useRealTimers();
    await resetLanguage();
  });

  it('lands on a constructDiagonal question offering a candidate handle for every other vertex', async () => {
    await useLanguage('en');
    startAdvancedConstruct();
    expect(document.querySelector('.geo4-scene[data-kind="constructDiagonal"]')).toBeInTheDocument();
    const handles = document.querySelectorAll('.geo-handle-hit');
    // One candidate segment per non-focus vertex (adjacent sides included as
    // valid-but-wrong taps, since the point is distinguishing a diagonal from a side).
    expect(handles.length).toBeGreaterThanOrEqual(3);
  });

  it('tapping a candidate that really is a diagonal answers correctly; tapping a side answers "not-diagonal" and allows retry', async () => {
    await useLanguage('en');
    startAdvancedConstruct();

    // Try candidates one at a time, in DOM order, until one resolves correct.
    // A wrong attempt moves the session into "retry" (after its feedback
    // beat), which keeps the same question on screen so the next candidate
    // can be tried — this directly exercises the "several diagonals can
    // validly answer this" requirement: the generator doesn't pin one exact
    // diagonal, and this loop proves at least one offered candidate works.
    let foundCorrect = false;
    for (let attempt = 0; attempt < 8 && !foundCorrect; attempt += 1) {
      const handles = Array.from(document.querySelectorAll<SVGElement>('.geo-handle-hit'));
      const handle = handles[attempt % handles.length];
      fireEvent.click(handle);
      const feedback = document.querySelector('.geo4-feedback');
      if (feedback?.classList.contains('is-correct')) {
        foundCorrect = true;
        break;
      }
      expect(feedback?.classList.contains('is-wrong')).toBe(true);
      // Advance past the wrong-answer feedback beat (2200ms) into "retry".
      act(() => vi.advanceTimersByTime(2300));
    }
    expect(foundCorrect).toBe(true);
  });
});
