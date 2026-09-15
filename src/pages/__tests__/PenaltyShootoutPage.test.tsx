import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/testUtils';
import { PenaltyShootoutPage } from '../PenaltyShootoutPage';

vi.mock('../../data/games/penaltyShootoutData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/penaltyShootoutData')>();
  const choices = (correct: number) => [
    { target: 'topLeft' as const, value: correct - 10 },
    { target: 'topRight' as const, value: correct },
    { target: 'bottomLeft' as const, value: correct + 1 },
    { target: 'bottomRight' as const, value: correct + 100 },
  ];
  return {
    ...original,
    PENALTY_SHOOTOUT_COUNT: 2,
    buildPenaltyShootoutMatch: () => [
      {
        id: 'kick-1',
        left: 32,
        right: 48,
        answer: 80,
        choices: choices(80),
        wrongOutcomes: { topLeft: 'save', topRight: 'post', bottomLeft: 'wide', bottomRight: 'save' },
        keeperDive: 'left',
      },
      {
        id: 'kick-2',
        left: 125,
        right: 68,
        answer: 193,
        choices: choices(193),
        wrongOutcomes: { topLeft: 'post', topRight: 'save', bottomLeft: 'wide', bottomRight: 'post' },
        keeperDive: 'right',
      },
    ],
  };
});

function answerButton(value: number) {
  const button = screen.getAllByRole('button').find((candidate) => candidate.textContent === String(value));
  if (!button) throw new Error(`Missing answer button ${value}`);
  return button;
}

function finishKick() {
  act(() => vi.advanceTimersByTime(400));
  act(() => vi.advanceTimersByTime(850));
}

describe('Penalty Shootout gameplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('he');
  });

  it('kicks toward a wrong target, teaches through a save, and retains the question', () => {
    const { container } = renderWithProviders(<PenaltyShootoutPage />);
    fireEvent.click(answerButton(70));
    expect(container.querySelector('.ps-ball-topLeft')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('penaltyShootout.results.save'));
    act(() => vi.advanceTimersByTime(850));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByText('32 + 48 = ?')).toBeInTheDocument();
  });

  it('scores, advances quickly, and completes after the configured question count', () => {
    renderWithProviders(<PenaltyShootoutPage />);
    fireEvent.click(answerButton(80));
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('penaltyShootout.results.goal'));
    act(() => vi.advanceTimersByTime(850));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    fireEvent.click(answerButton(193));
    finishKick();
    expect(screen.getByText(i18n.t('penaltyShootout.completion.title'))).toBeInTheDocument();
  });

  it.each(['he', 'en'] as const)('renders localized %s UI with an LTR expression', async (language) => {
    await i18n.changeLanguage(language);
    const { container } = renderWithProviders(<PenaltyShootoutPage />);
    expect(screen.getByRole('heading', { level: 1, name: i18n.t('penaltyShootout.gameName') })).toBeInTheDocument();
    expect(screen.getByText('32 + 48 = ?')).toHaveAttribute('dir', 'ltr');
    expect(container.textContent).not.toContain('penaltyShootout.');
  });
});
