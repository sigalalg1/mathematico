import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { AnglesQuickRecapPage } from '../AnglesQuickRecapPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import type { QuickRecapQuestion } from '../../types/anglesGrade7';

// A fixed seed makes the whole round deterministic for these tests — the
// generator's own soundness (every seed, not just this one) is covered by
// `anglesQuickRecapData.test.ts`. `vi.mock` factories are hoisted above every
// top-level declaration, so the mutable holder is created via `vi.hoisted`
// rather than a plain module-level `let` (which would still be in its TDZ
// when the hoisted factory runs).
const held = vi.hoisted(() => ({ questions: [] as QuickRecapQuestion[] }));

vi.mock('../../data/games/anglesQuickRecapData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/games/anglesQuickRecapData')>();
  held.questions = actual.buildAnglesQuickRecapQuestions(7);
  return { ...actual, buildAnglesQuickRecapQuestions: () => held.questions };
});

function optionButtons() {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-testid="quick-recap-option"]')];
}

/**
 * Clicks the correct option for the current question. The page renders
 * `question.options` in order, one button per option, so the answer's index
 * in `options` is exactly the button to click — no text matching needed
 * (several option kinds render as `∠XYZ`/`<`/`NN°`, not plain i18n text).
 */
function answerCurrentQuestion(index: number) {
  const question = held.questions[index];
  const buttons = optionButtons();
  const answerPosition = question.options.indexOf(question.answer);
  fireEvent.click(buttons[answerPosition]);
}

describe('AnglesQuickRecapPage', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    vi.useRealTimers();
    await resetLanguage();
  });

  it('starts directly on question 1 of 10 — no setup screen', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesQuickRecapPage />);
    expect(screen.getByTestId('quick-recap-progress')).toHaveTextContent('Question 1 of 10');
    expect(document.querySelector('.geo-stage')).toBeInTheDocument();
    expect(optionButtons().length).toBeGreaterThan(1);
  });

  it('is reachable from, and links back to, the Grade 7 geometry topic page', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesQuickRecapPage />);
    expect(screen.getByRole('link', { name: /Geometry.*Angles/i })).toHaveAttribute('href', '/grade/7/geometry');
  });

  it('shows correct/wrong feedback and advances through all ten questions to a results screen with the right score', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesQuickRecapPage />);

    for (let i = 0; i < 10; i += 1) {
      expect(screen.getByTestId('quick-recap-progress')).toHaveTextContent(`Question ${i + 1} of 10`);
      answerCurrentQuestion(i);
      expect(screen.getByTestId('quick-recap-feedback')).toHaveClass('is-correct');
      act(() => vi.advanceTimersByTime(2500));
    }

    expect(screen.getByTestId('quick-recap-results')).toBeInTheDocument();
    expect(screen.getByText('10 out of 10 correct.')).toBeInTheDocument();
  });

  it('marks a wrong answer as wrong and still advances (no forced retry — this is a light trivia round)', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesQuickRecapPage />);

    const question = held.questions[0];
    const wrongOption = question.options.find((o) => o !== question.answer)!;
    const buttons = optionButtons();
    fireEvent.click(buttons[question.options.indexOf(wrongOption)]);

    expect(screen.getByTestId('quick-recap-feedback')).toHaveClass('is-wrong');
    act(() => vi.advanceTimersByTime(2500));
    expect(screen.getByTestId('quick-recap-progress')).toHaveTextContent('Question 2 of 10');
  });

  it('lets a child start a fresh round from the results screen ("play again")', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesQuickRecapPage />);

    for (let i = 0; i < 10; i += 1) {
      answerCurrentQuestion(i);
      act(() => vi.advanceTimersByTime(2500));
    }
    expect(screen.getByTestId('quick-recap-results')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('quick-recap-play-again'));
    expect(screen.getByTestId('quick-recap-progress')).toHaveTextContent('Question 1 of 10');
  });

  it('every ∠-notation / "<, =, >" option stays LTR even on a Hebrew RTL page', async () => {
    await useLanguage('he');
    renderWithProviders(<AnglesQuickRecapPage />);
    // Walk to the notation questions (index 4) to exercise MathText rendering.
    for (let i = 0; i < 4; i += 1) {
      answerCurrentQuestion(i);
      act(() => vi.advanceTimersByTime(2500));
    }
    const math = document.querySelectorAll('.math-text');
    expect(math.length).toBeGreaterThan(0);
    for (const node of math) expect(node).toHaveAttribute('dir', 'ltr');
  });
});
