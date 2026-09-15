import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { NumberLinePlacePage } from '../NumberLinePlacePage';
import type { PlaceChallenge } from '../../types/numberLinePlace';

// A short fully-numbered line, then a long sparsely-numbered one with a step of 2.
const EASY: PlaceChallenge = {
  id: 'q1',
  min: -5,
  max: 5,
  step: 1,
  labeledValues: [-5, -4, -2, -1, 0, 1, 2, 4, 5],
  target: 3,
  anchor: 2,
};

const HARD: PlaceChallenge = {
  id: 'q2',
  min: -20,
  max: 20,
  step: 2,
  labeledValues: [-20, 0, 20],
  target: -6,
  anchor: 0,
};

vi.mock('../../data/games/numberLinePlaceData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/games/numberLinePlaceData')>();
  return {
    ...actual,
    NUMBER_LINE_PLACE_TOTAL: 2,
    buildNumberLinePlaceChallenges: () => [EASY, HARD],
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const tick = (value: number) => screen.getByRole('button', { name: String(value) });
const tickLabels = (container: HTMLElement) => [...container.querySelectorAll('.number-line-tick-label')].map((n) => n.textContent);

function solveFirst() {
  fireEvent.click(tick(3));
  act(() => vi.advanceTimersByTime(1500));
}

describe('Find the Spot — reading the line', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks for a specific number and makes every tick clickable', () => {
    renderWithProviders(<NumberLinePlacePage />);
    expect(screen.getByText(t('numberLinePlace.prompt.locate'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    for (const value of [-5, -3, 0, 3, 5]) expect(tick(value)).toBeInTheDocument();
  });

  it('hides the target tick label and its neighbours so the student has to count', () => {
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    const labels = tickLabels(container);
    expect(labels).toContain('0');
    expect(labels).toContain('2');
    expect(labels).not.toContain('3');
  });

  it('advances when the right tick is clicked', () => {
    renderWithProviders(<NumberLinePlacePage />);
    expect(progress()).toBe('1');
    solveFirst();
    expect(progress()).toBe('2');
  });

  it('measures the distance from zero once the answer is right', () => {
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    fireEvent.click(tick(3));
    const span = container.querySelector('.number-line-span-correct');
    expect(span).toBeInTheDocument();
    expect(span?.querySelector('.number-line-span-label')?.textContent).toBe('3');
  });
});

describe('Find the Spot — wrong answers teach', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the mirrored distance and the correct side when the sign is flipped', () => {
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    fireEvent.click(tick(-3));

    expect(progress()).toBe('1');
    expect(screen.getByText(t('numberLinePlace.feedback.shouldBeRight', { distance: 3 }))).toBeInTheDocument();
    expect(container.querySelector('.number-line-span-incorrect')).toBeInTheDocument();
    expect(container.querySelector('.number-line-region')).toBeInTheDocument();
  });

  it('asks the student to recount when they land one tick away', () => {
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    fireEvent.click(tick(4));
    expect(screen.getByText(t('numberLinePlace.feedback.countAgain', { anchor: '2', step: 1 }))).toBeInTheDocument();
    // The gap they actually counted is measured for them.
    expect(container.querySelector('.number-line-span-incorrect .number-line-span-label')?.textContent).toBe('2');
  });

  it('explains what one tick is worth after a far-off click', () => {
    renderWithProviders(<NumberLinePlacePage />);
    fireEvent.click(tick(-1));
    expect(screen.getByText(t('numberLinePlace.feedback.oneTickWorth', { step: 1 }))).toBeInTheDocument();
  });

  it('never reveals the target tick while the answer is still wrong', () => {
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    fireEvent.click(tick(-3));
    expect(container.querySelectorAll('.number-line-point.is-correct')).toHaveLength(0);
    expect(container.querySelectorAll('.number-line-point.is-incorrect')).toHaveLength(1);
  });

  it('allows a retry in place and only locks the line once the answer is right', () => {
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    fireEvent.click(tick(-3));
    expect(container.querySelectorAll('.number-line-point.is-disabled')).toHaveLength(0);
    expect(tick(3)).toHaveAttribute('tabindex', '0');

    fireEvent.click(tick(3));
    expect(container.querySelectorAll('.number-line-point:not(.is-disabled)')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1500));
    expect(progress()).toBe('2');
  });
});

describe('Find the Spot — harder lines and completion', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('moves on to a sparsely labelled line with a step larger than one', () => {
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    solveFirst();
    expect(tickLabels(container).sort()).toEqual(['-20', '0', '20']);
    expect(tick(-6)).toBeInTheDocument();
  });

  it('counts in ticks, not units, when explaining the harder line', () => {
    renderWithProviders(<NumberLinePlacePage />);
    solveFirst();
    fireEvent.click(tick(-6));
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(t('numberLinePlace.completion.title'))).toBeInTheDocument();
  });

  it('finishes the session and offers a replay', () => {
    renderWithProviders(<NumberLinePlacePage />);
    solveFirst();
    fireEvent.click(tick(-6));
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(t('signedNumbers.actions.playAgain'))).toBeInTheDocument();
  });
});

describe('Find the Spot — languages', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('keeps signed-number notation LTR inside the Hebrew page', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    const mathNodes = container.querySelectorAll('.math-text');
    expect(mathNodes.length).toBeGreaterThan(0);
    for (const node of mathNodes) expect(node).toHaveAttribute('dir', 'ltr');
    expect(container.querySelector('.number-line')).toHaveAttribute('dir', 'ltr');
  });

  it('renders in English with no raw translation keys', async () => {
    await useLanguage('en');
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    expect(container.textContent).not.toContain('numberLinePlace.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('Find the Spot')).toBeInTheDocument();
  });

  it('renders in Hebrew with no raw translation keys', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<NumberLinePlacePage />);
    expect(container.textContent).not.toContain('numberLinePlace.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('מוצאים את המקום')).toBeInTheDocument();
  });
});
