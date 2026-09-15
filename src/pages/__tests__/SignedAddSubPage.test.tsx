import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { SignedAddSubPage } from '../SignedAddSubPage';
import type { AddSubChallenge } from '../../types/signedAddSub';

// -3 + 5 = 2, then the turn-around case 4 - (-3) = 7.
const ADDITION: AddSubChallenge = {
  id: 'q1',
  min: -10,
  max: 10,
  step: 1,
  start: -3,
  operator: '+',
  term: 5,
  delta: 5,
  result: 2,
};

const SUBTRACT_NEGATIVE: AddSubChallenge = {
  id: 'q2',
  min: -10,
  max: 10,
  step: 1,
  start: 4,
  operator: '-',
  term: -3,
  delta: 3,
  result: 7,
};

vi.mock('../../data/games/signedAddSubData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/games/signedAddSubData')>();
  return {
    ...actual,
    SIGNED_ADD_SUB_TOTAL: 2,
    buildSignedAddSubChallenges: () => [ADDITION, SUBTRACT_NEGATIVE],
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const tick = (value: number) => screen.getByRole('button', { name: String(value) });
const hopLabels = (container: HTMLElement) => [...container.querySelectorAll('.number-line-hop-label')].map((n) => n.textContent);
/** Where the walker is standing, as its rendered x position. */
const walkerX = (container: HTMLElement) =>
  Number(/translate\(([-\d.]+)/.exec(container.querySelector('.number-line-walker')?.getAttribute('transform') ?? '')?.[1]);

function solveFirst() {
  fireEvent.click(tick(2));
  act(() => vi.advanceTimersByTime(1800));
}

describe('Steps on the Line — movement is the gameplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the expression and starts the walker on its left-hand number', () => {
    const { container } = renderWithProviders(<SignedAddSubPage />);
    expect(screen.getByText('-3 + 5 = ?')).toBeInTheDocument();
    // The walker stands left of centre, where -3 sits on a -10..10 line.
    expect(walkerX(container)).toBeLessThan(320);
  });

  it('draws the whole move as an arc and writes the expression out once solved', () => {
    const { container } = renderWithProviders(<SignedAddSubPage />);
    fireEvent.click(tick(2));
    expect(container.querySelector('.number-line-hop-correct')).toBeInTheDocument();
    expect(hopLabels(container)).toEqual(['5']);
    // The walker has slid right, to where it landed.
    expect(walkerX(container)).toBeGreaterThan(320);
    expect(screen.getByText('-3 + 5 = 2')).toBeInTheDocument();
  });

  it('advances only once the landing point is right', () => {
    renderWithProviders(<SignedAddSubPage />);
    expect(progress()).toBe('1');
    solveFirst();
    expect(progress()).toBe('2');
  });
});

describe('Steps on the Line — wrong answers show the move that was made', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('draws the move the student actually made, labelled with its size and sign', () => {
    const { container } = renderWithProviders(<SignedAddSubPage />);
    fireEvent.click(tick(-8));

    expect(progress()).toBe('1');
    expect(container.querySelector('.number-line-hop-incorrect')).toBeInTheDocument();
    expect(hopLabels(container)).toContain('-5');
  });

  it('nudges the first step the right way when the direction was wrong', () => {
    const { container } = renderWithProviders(<SignedAddSubPage />);
    fireEvent.click(tick(-8));
    expect(
      screen.getByText(t('signedAddSub.feedback.wrongDirection', { direction: t('signedAddSub.direction.right') })),
    ).toBeInTheDocument();
    // The student's arc plus the one-step direction nudge.
    expect(container.querySelectorAll('.number-line-hop')).toHaveLength(2);
  });

  it('asks the student to recount when the direction was right', () => {
    renderWithProviders(<SignedAddSubPage />);
    fireEvent.click(tick(4));
    expect(screen.getByText(t('signedAddSub.feedback.countSteps'))).toBeInTheDocument();
  });

  it('never reveals the landing point while the answer is still wrong', () => {
    const { container } = renderWithProviders(<SignedAddSubPage />);
    fireEvent.click(tick(-8));
    expect(container.querySelectorAll('.number-line-point.is-correct')).toHaveLength(0);
    expect(container.querySelectorAll('.number-line-point.is-incorrect')).toHaveLength(1);
  });

  it('allows a retry in place and only locks once correct', () => {
    const { container } = renderWithProviders(<SignedAddSubPage />);
    fireEvent.click(tick(-8));
    expect(container.querySelectorAll('.number-line-point.is-disabled')).toHaveLength(0);

    fireEvent.click(tick(2));
    expect(container.querySelectorAll('.number-line-point:not(.is-disabled)')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1800));
    expect(progress()).toBe('2');
  });
});

describe('Steps on the Line — subtracting a negative', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('writes the negative term in brackets', () => {
    renderWithProviders(<SignedAddSubPage />);
    solveFirst();
    expect(screen.getByText('4 - (-3) = ?')).toBeInTheDocument();
  });

  it('explains the turn-around rule when the student moves left instead', () => {
    renderWithProviders(<SignedAddSubPage />);
    solveFirst();
    fireEvent.click(tick(1));
    expect(screen.getByText(t('signedAddSub.feedback.subtractNegative'))).toBeInTheDocument();
  });

  it('finishes the session once both moves land', () => {
    renderWithProviders(<SignedAddSubPage />);
    solveFirst();
    fireEvent.click(tick(7));
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByText(t('signedAddSub.completion.title'))).toBeInTheDocument();
  });
});

describe('Steps on the Line — languages', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('keeps the expression LTR inside the Hebrew page', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<SignedAddSubPage />);
    const mathNodes = container.querySelectorAll('.math-text');
    expect(mathNodes.length).toBeGreaterThan(0);
    for (const node of mathNodes) expect(node).toHaveAttribute('dir', 'ltr');
    expect(container.querySelector('.number-line')).toHaveAttribute('dir', 'ltr');
  });

  it('renders in English with no raw translation keys', async () => {
    await useLanguage('en');
    const { container } = renderWithProviders(<SignedAddSubPage />);
    expect(container.textContent).not.toContain('signedAddSub.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('Steps on the Line')).toBeInTheDocument();
  });

  it('renders in Hebrew with no raw translation keys', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<SignedAddSubPage />);
    expect(container.textContent).not.toContain('signedAddSub.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('צעדים על הישר')).toBeInTheDocument();
  });
});
