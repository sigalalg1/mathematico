import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, useLanguage, resetLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { FractionBalloonsPage } from '../FractionBalloonsPage';
import type { BalloonQuestion } from '../../types/fractionBalloons';

// A fixed three-question session: one symbolic, one visual, one symbolic.
vi.mock('../../data/games/fractionBalloonsData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/fractionBalloonsData')>();
  const questions: BalloonQuestion[] = [
    {
      id: 'q1',
      kind: 'symbolic',
      target: { numerator: 3, denominator: 4 },
      shape: 'circle',
      selectedPieces: [],
      options: [
        { numerator: 1, denominator: 3 },
        { numerator: 3, denominator: 4 },
        { numerator: 2, denominator: 5 },
        { numerator: 1, denominator: 2 },
      ],
    },
    {
      id: 'q2',
      kind: 'visual',
      target: { numerator: 2, denominator: 3 },
      shape: 'bar',
      selectedPieces: [0, 1],
      options: [
        { numerator: 2, denominator: 3 },
        { numerator: 1, denominator: 4 },
        { numerator: 3, denominator: 5 },
        { numerator: 1, denominator: 2 },
      ],
    },
    {
      id: 'q3',
      kind: 'symbolic',
      target: { numerator: 1, denominator: 2 },
      shape: 'grid',
      selectedPieces: [],
      options: [
        { numerator: 1, denominator: 3 },
        { numerator: 1, denominator: 4 },
        { numerator: 1, denominator: 2 },
        { numerator: 3, denominator: 5 },
      ],
    },
  ];
  return {
    ...original,
    FRACTION_BALLOONS_TOTAL: questions.length,
    buildFractionBalloonQuestions: () => questions.map((question) => ({ ...question })),
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

const balloon = (numerator: number, denominator: number) => screen.getByTestId(`fb-balloon-${numerator}-${denominator}`);
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');

/** Taps a balloon and lets any burst animation finish. */
function pop(numerator: number, denominator: number) {
  fireEvent.click(balloon(numerator, denominator));
  act(() => vi.advanceTimersByTime(800));
}

describe('Fraction Balloons', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the target fraction and four balloons', () => {
    renderWithProviders(<FractionBalloonsPage />);

    expect(screen.getByTestId('fb-target-fraction')).toHaveAccessibleName('3/4');
    expect(screen.getAllByTestId(/^fb-balloon-/)).toHaveLength(4);
    expect(progress()).toBe('1');
  });

  it('shows a visual whole instead of a prompt fraction on a visual question', () => {
    renderWithProviders(<FractionBalloonsPage />);

    pop(3, 4);

    expect(screen.getByTestId('fb-target-shape')).toBeInTheDocument();
    expect(screen.queryByTestId('fb-target-fraction')).not.toBeInTheDocument();
  });

  it('pops the tapped balloon and moves to the next question when it is correct', () => {
    renderWithProviders(<FractionBalloonsPage />);

    fireEvent.click(balloon(3, 4));
    expect(screen.getByTestId('fb-burst')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('keeps a wrongly tapped balloon in the sky and lets the child try again', () => {
    renderWithProviders(<FractionBalloonsPage />);

    fireEvent.click(balloon(1, 3));
    act(() => vi.advanceTimersByTime(800));

    expect(progress()).toBe('1');
    expect(balloon(1, 3)).toBeInTheDocument();
    expect(screen.queryByTestId('fb-burst')).not.toBeInTheDocument();

    pop(3, 4);
    expect(progress()).toBe('2');
  });

  it('celebrates once the whole session is popped, and replays', () => {
    renderWithProviders(<FractionBalloonsPage />);

    pop(3, 4);
    pop(2, 3);
    expect(screen.queryByText(t('fractionBalloons.completion.title'))).not.toBeInTheDocument();

    pop(1, 2);
    expect(screen.getByText(t('fractionBalloons.completion.title'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('fractionBalloons.actions.playAgain') }));
    expect(progress()).toBe('1');
  });
});

describe('Fraction Balloons — languages', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('renders Hebrew without raw keys', () => {
    renderWithProviders(<FractionBalloonsPage />);

    expect(screen.getByText(t('fractionBalloons.prompt.symbolic'))).toBeInTheDocument();
    expect(screen.queryByText(/fractionBalloons\./)).not.toBeInTheDocument();
  });

  it('renders English without raw keys', async () => {
    await useLanguage('en');
    renderWithProviders(<FractionBalloonsPage />);

    expect(screen.getByText('Find the fraction')).toBeInTheDocument();
    expect(screen.queryByText(/fractionBalloons\./)).not.toBeInTheDocument();
  });
});
