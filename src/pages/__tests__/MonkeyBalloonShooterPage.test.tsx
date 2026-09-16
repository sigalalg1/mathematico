import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, useLanguage, resetLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { MonkeyBalloonShooterPage } from '../MonkeyBalloonShooterPage';
import type { ShooterQuestion } from '../../types/monkeyBalloonShooter';

// A fixed three-fact session, so the tests know exactly which balloon is right.
vi.mock('../../data/games/monkeyBalloonShooterData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/monkeyBalloonShooterData')>();
  const questions: ShooterQuestion[] = [
    { id: 'q1', fact: { left: 3, right: 4, product: 12 }, options: [9, 12, 16, 15] },
    { id: 'q2', fact: { left: 5, right: 5, product: 25 }, options: [20, 30, 25, 24] },
    { id: 'q3', fact: { left: 7, right: 8, product: 56 }, options: [49, 63, 64, 56] },
  ];
  return {
    ...original,
    MONKEY_SHOOTER_TOTAL: questions.length,
    buildMonkeyShooterQuestions: () => questions.map((question) => ({ ...question, options: [...question.options] })),
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

const balloon = (value: number) => screen.getByTestId(`mb-balloon-${value}`);
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const monkeyPose = () => screen.getByTestId('mb-monkey').getAttribute('data-pose');

/**
 * Shoots a balloon and lets the dart, then the pop or the bounce, play out.
 * Two beats, because the second timer is only scheduled once the dart has landed.
 */
function shoot(value: number) {
  fireEvent.click(balloon(value));
  act(() => vi.advanceTimersByTime(400));
  act(() => vi.advanceTimersByTime(800));
}

describe('Monkey Balloon Shooter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the multiplication fact and four answer balloons', () => {
    renderWithProviders(<MonkeyBalloonShooterPage />);

    expect(within(screen.getByTestId('mb-question')).getByText('3', { selector: '.mb-fact > span' }).closest('.mb-fact')).toHaveTextContent('3×4=?');
    expect(screen.getAllByTestId(/^mb-balloon-/)).toHaveLength(4);
    expect(progress()).toBe('1');
    expect(monkeyPose()).toBe('idle');
  });

  it('fires a dart, pops the right balloon, cheers and moves on', () => {
    renderWithProviders(<MonkeyBalloonShooterPage />);

    fireEvent.click(balloon(12));
    expect(screen.getByTestId('mb-dart')).toBeInTheDocument();
    expect(screen.getByTestId('mb-trajectory')).toBeInTheDocument();
    expect(balloon(12)).toHaveClass('mb-balloon-targeted');
    expect(monkeyPose()).toBe('aiming');

    // The dart lands: the balloon bursts and the monkey celebrates.
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('mb-burst')).toBeInTheDocument();
    expect(balloon(12)).toHaveClass('mb-balloon-popping');
    expect(monkeyPose()).toBe('happy');

    act(() => vi.advanceTimersByTime(600));
    expect(progress()).toBe('2');
    expect(screen.getByTestId('mb-question').querySelector('.mb-fact')).toHaveTextContent('5×5=?');
  });

  it('leaves a wrongly shot balloon in the air and lets the child try again', () => {
    renderWithProviders(<MonkeyBalloonShooterPage />);

    fireEvent.click(balloon(16));
    act(() => vi.advanceTimersByTime(300));
    expect(monkeyPose()).toBe('puzzled');
    expect(screen.queryByTestId('mb-burst')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(900));
    expect(progress()).toBe('1');
    expect(balloon(16)).toBeInTheDocument();

    shoot(12);
    expect(progress()).toBe('2');
  });

  it('celebrates once the whole session is popped, and replays', () => {
    renderWithProviders(<MonkeyBalloonShooterPage />);

    shoot(12);
    shoot(25);
    expect(screen.queryByText(t('monkeyBalloonShooter.completion.title'))).not.toBeInTheDocument();

    shoot(56);
    expect(screen.getByText(t('monkeyBalloonShooter.completion.title'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('monkeyBalloonShooter.actions.playAgain') }));
    expect(progress()).toBe('1');
  });
});

describe('Monkey Balloon Shooter — languages', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('renders Hebrew without raw keys', () => {
    renderWithProviders(<MonkeyBalloonShooterPage />);

    expect(screen.getByText(t('monkeyBalloonShooter.prompt'))).toBeInTheDocument();
    expect(screen.queryByText(/monkeyBalloonShooter\./)).not.toBeInTheDocument();
  });

  it('renders English without raw keys, with the fact left-to-right', async () => {
    await useLanguage('en');
    renderWithProviders(<MonkeyBalloonShooterPage />);

    expect(screen.getByText('Which balloon has the answer?')).toBeInTheDocument();
    expect(screen.getByTestId('mb-question').querySelector('.mb-fact')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('mb-question').querySelector('.mb-fact')).toHaveTextContent('3×4=?');
    expect(screen.queryByText(/monkeyBalloonShooter\./)).not.toBeInTheDocument();
  });
});
