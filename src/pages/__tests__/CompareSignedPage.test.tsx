import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { CompareSignedPage } from '../CompareSignedPage';
import type { CompareChallenge } from '../../types/compareSigned';

// Two negatives (the classic trap), then a mixed-sign "smallest" question.
const NEGATIVES: CompareChallenge = {
  id: 'q1',
  min: -10,
  max: 10,
  step: 1,
  goal: 'greatest',
  candidates: [
    { id: 'a', value: -7 },
    { id: 'b', value: -3 },
  ],
  answer: -3,
  correctCandidateId: 'b',
};

const MIXED: CompareChallenge = {
  id: 'q2',
  min: -10,
  max: 10,
  step: 1,
  goal: 'smallest',
  candidates: [
    { id: 'c', value: -8 },
    { id: 'd', value: 4 },
  ],
  answer: -8,
  correctCandidateId: 'c',
};

vi.mock('../../data/games/compareSignedData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/games/compareSignedData')>();
  return {
    ...actual,
    COMPARE_SIGNED_TOTAL: 2,
    buildCompareSignedChallenges: () => [NEGATIVES, MIXED],
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const candidate = (label: string) => screen.getByRole('button', { name: label });

function solveFirst() {
  fireEvent.click(candidate('-3'));
  act(() => vi.advanceTimersByTime(1500));
}

describe('Which Is Greater — comparing on the line', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plots both numbers on the line as clickable, labelled points', () => {
    renderWithProviders(<CompareSignedPage />);
    expect(screen.getByText(t('compareSigned.prompt.greatest'))).toBeInTheDocument();
    expect(candidate('-7')).toBeInTheDocument();
    expect(candidate('-3')).toBeInTheDocument();
  });

  it('reminds the student that further right means greater', () => {
    renderWithProviders(<CompareSignedPage />);
    expect(screen.getByText(t('compareSigned.hint'))).toBeInTheDocument();
  });

  it('advances and shades the winning stretch of line when the answer is right', () => {
    const { container } = renderWithProviders(<CompareSignedPage />);
    fireEvent.click(candidate('-3'));
    expect(container.querySelector('.number-line-region-correct')).toBeInTheDocument();
    expect(screen.getByText(t('compareSigned.feedback.recapGreatest', { value: '-3' }))).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    expect(progress()).toBe('2');
  });
});

describe('Which Is Greater — wrong answers teach', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('measures every distance from zero when the student compares the digits', () => {
    const { container } = renderWithProviders(<CompareSignedPage />);
    fireEvent.click(candidate('-7'));

    expect(progress()).toBe('1');
    expect(screen.getByText(t('compareSigned.feedback.biggerDistanceIsSmaller'))).toBeInTheDocument();
    const labels = [...container.querySelectorAll('.number-line-span-label')].map((n) => n.textContent);
    expect(labels.sort()).toEqual(['3', '7']);
  });

  it('explains that a negative is never greater than a positive', () => {
    renderWithProviders(<CompareSignedPage />);
    solveFirst();
    fireEvent.click(candidate('4'));
    expect(screen.getByText(t('compareSigned.feedback.negativeIsAlwaysSmaller'))).toBeInTheDocument();
  });

  it('never reveals the right answer while the student is still wrong', () => {
    const { container } = renderWithProviders(<CompareSignedPage />);
    fireEvent.click(candidate('-7'));
    expect(container.querySelectorAll('.number-line-point.is-correct')).toHaveLength(0);
    expect(container.querySelectorAll('.number-line-point.is-incorrect')).toHaveLength(1);
  });

  it('allows a retry in place and only locks once the answer is right', () => {
    const { container } = renderWithProviders(<CompareSignedPage />);
    fireEvent.click(candidate('-7'));
    expect(container.querySelectorAll('.number-line-point.is-disabled')).toHaveLength(0);
    expect(candidate('-3')).toHaveAttribute('tabindex', '0');

    fireEvent.click(candidate('-3'));
    expect(container.querySelectorAll('.number-line-point:not(.is-disabled)')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1500));
    expect(progress()).toBe('2');
  });
});

describe('Which Is Greater — completion', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('switches the goal to "smallest" and finishes the session', () => {
    renderWithProviders(<CompareSignedPage />);
    solveFirst();
    expect(screen.getByText(t('compareSigned.prompt.smallest'))).toBeInTheDocument();

    fireEvent.click(candidate('-8'));
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText(t('compareSigned.completion.title'))).toBeInTheDocument();
  });
});

describe('Which Is Greater — languages', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('keeps signed-number notation LTR inside the Hebrew page', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<CompareSignedPage />);
    expect(container.querySelector('.number-line')).toHaveAttribute('dir', 'ltr');
  });

  it('renders in English with no raw translation keys', async () => {
    await useLanguage('en');
    const { container } = renderWithProviders(<CompareSignedPage />);
    expect(container.textContent).not.toContain('compareSigned.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('Which Is Greater?')).toBeInTheDocument();
  });

  it('renders in Hebrew with no raw translation keys', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<CompareSignedPage />);
    expect(container.textContent).not.toContain('compareSigned.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('מי גדול יותר?')).toBeInTheDocument();
  });
});
