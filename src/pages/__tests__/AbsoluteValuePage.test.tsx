import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { AbsoluteValuePage } from '../AbsoluteValuePage';
import type { AbsoluteChallenge } from '../../types/absoluteValue';

const EVALUATE: AbsoluteChallenge = {
  id: 'q1',
  kind: 'evaluate',
  min: -10,
  max: 10,
  step: 1,
  subject: -6,
  partner: null,
  distance: 6,
  side: null,
  answer: 6,
  plotted: [{ id: 'q1-subject', value: -6, label: '-6' }],
};

const BACKWARDS: AbsoluteChallenge = {
  id: 'q2',
  kind: 'findFromDistance',
  min: -10,
  max: 10,
  step: 1,
  subject: -4,
  partner: null,
  distance: 4,
  side: 'negative',
  answer: -4,
  plotted: [],
};

const BETWEEN: AbsoluteChallenge = {
  id: 'q3',
  kind: 'distanceBetween',
  min: -10,
  max: 10,
  step: 1,
  subject: -3,
  partner: 4,
  distance: 7,
  side: null,
  answer: 7,
  plotted: [
    { id: 'q3-a', value: -3, label: 'A' },
    { id: 'q3-b', value: 4, label: 'B' },
  ],
};

vi.mock('../../data/games/absoluteValueData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/games/absoluteValueData')>();
  return {
    ...actual,
    ABSOLUTE_VALUE_TOTAL: 3,
    buildAbsoluteValueChallenges: () => [EVALUATE, BACKWARDS, BETWEEN],
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const tick = (value: number) => screen.getByRole('button', { name: String(value) });

function solve(value: number) {
  fireEvent.click(tick(value));
  act(() => vi.advanceTimersByTime(1500));
}

describe('Distance from Zero — reading an absolute value', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the absolute-value notation and plots the number it is about', () => {
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    expect(screen.getByText('|-6|')).toBeInTheDocument();
    expect([...container.querySelectorAll('.number-line-marker-label')].map((n) => n.textContent)).toEqual(['-6']);
  });

  it('measures the distance from zero and writes it symbolically once solved', () => {
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    fireEvent.click(tick(6));
    expect(container.querySelector('.number-line-span-correct .number-line-span-label')?.textContent).toBe('6');
    expect(screen.getByText('|-6| = 6')).toBeInTheDocument();
  });

  it('advances only once the answer is right', () => {
    renderWithProviders(<AbsoluteValuePage />);
    expect(progress()).toBe('1');
    solve(6);
    expect(progress()).toBe('2');
  });
});

describe('Distance from Zero — wrong answers teach', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('says a distance is never negative when the student keeps the minus sign', () => {
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    fireEvent.click(tick(-6));
    expect(progress()).toBe('1');
    expect(screen.getByText(t('absoluteValue.feedback.neverNegative'))).toBeInTheDocument();
    expect(container.querySelector('.number-line-span-incorrect .number-line-span-label')?.textContent).toBe('6');
  });

  it('asks the student to measure again after a far-off click', () => {
    renderWithProviders(<AbsoluteValuePage />);
    fireEvent.click(tick(1));
    expect(screen.getByText(t('absoluteValue.feedback.measureFromZero'))).toBeInTheDocument();
  });

  it('allows a retry in place and only locks once correct', () => {
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    fireEvent.click(tick(-6));
    expect(container.querySelectorAll('.number-line-point.is-disabled')).toHaveLength(0);
    expect(container.querySelectorAll('.number-line-point.is-correct')).toHaveLength(0);

    fireEvent.click(tick(6));
    expect(container.querySelectorAll('.number-line-point:not(.is-disabled)')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1500));
    expect(progress()).toBe('2');
  });
});

describe('Distance from Zero — working backwards and measuring gaps', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('names the side of zero so the backwards question has one answer', () => {
    renderWithProviders(<AbsoluteValuePage />);
    solve(6);
    expect(screen.getByText(t('absoluteValue.prompt.findFromDistance', { distance: 4 }))).toBeInTheDocument();
  });

  it('calls out the wrong side of zero without revealing the answer', () => {
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    solve(6);
    fireEvent.click(tick(4));
    expect(screen.getByText(t('absoluteValue.feedback.wrongSide'))).toBeInTheDocument();
    expect(container.querySelectorAll('.number-line-point.is-correct')).toHaveLength(0);
  });

  it('brackets the gap between the two drawn points without writing its size on it', () => {
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    solve(6);
    solve(-4);

    expect(screen.getByText(t('absoluteValue.prompt.distanceBetween'))).toBeInTheDocument();
    expect([...container.querySelectorAll('.number-line-marker-label')].map((n) => n.textContent)).toEqual(['A', 'B']);

    fireEvent.click(tick(2));
    expect(screen.getByText(t('absoluteValue.feedback.countTheGap'))).toBeInTheDocument();
    expect(container.querySelector('.number-line-span')).toBeInTheDocument();
    expect(container.querySelector('.number-line-span-label')).not.toBeInTheDocument();
  });

  it('finishes the session with the subtraction written out', () => {
    renderWithProviders(<AbsoluteValuePage />);
    solve(6);
    solve(-4);
    fireEvent.click(tick(7));
    expect(screen.getByText('|4 - (-3)| = 7')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(t('absoluteValue.completion.title'))).toBeInTheDocument();
  });
});

describe('Distance from Zero — languages', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('keeps absolute-value notation LTR inside the Hebrew page', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    const mathNodes = container.querySelectorAll('.math-text');
    expect(mathNodes.length).toBeGreaterThan(0);
    for (const node of mathNodes) expect(node).toHaveAttribute('dir', 'ltr');
    expect(container.querySelector('.number-line')).toHaveAttribute('dir', 'ltr');
  });

  it('renders in English with no raw translation keys', async () => {
    await useLanguage('en');
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    expect(container.textContent).not.toContain('absoluteValue.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('Distance from Zero')).toBeInTheDocument();
  });

  it('renders in Hebrew with no raw translation keys', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<AbsoluteValuePage />);
    expect(container.textContent).not.toContain('absoluteValue.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('מרחק מאפס')).toBeInTheDocument();
  });
});
