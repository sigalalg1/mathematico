import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import type { TrainingActivityDefinition } from '../../types/training';
import { BasketballMonkeyPage } from '../BasketballMonkeyPage';
import App from '../../App';

const playSound = vi.fn();
vi.mock('../../audio/useSound', () => ({
  useSound: () => ({ enabled: true, play: playSound, toggle: vi.fn() }),
}));

vi.mock('../../data/games/basketballMonkeyData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/basketballMonkeyData')>();
  const activity: TrainingActivityDefinition = {
    ...original.basketballMonkeyActivity,
    generateQuestions: ({ count }) =>
      Array.from({ length: count }, (_, index) => ({
        id: `basketball-${index}`,
        prompt: `${21 + index} × 3`,
        answer: String((21 + index) * 3),
        options: [
          String((21 + index) * 3),
          String((21 + index) * 3 + 3),
          String((21 + index) * 3 - 3),
          String((21 + index) * 3 + 10),
        ],
      })),
  };
  return { ...original, basketballMonkeyActivity: activity };
});

function start(count = 5) {
  fireEvent.click(screen.getByTestId(`tr-count-${count}`));
  fireEvent.click(screen.getByTestId('tr-start'));
}

async function settleShot() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('Basketball Monkey training activity', () => {
  beforeEach(() => {
    localStorage.clear();
    playSound.mockClear();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await resetLanguage();
  });

  it('offers the shared 5/10/20 setup and all difficulty values', () => {
    renderWithProviders(<BasketballMonkeyPage />);
    for (const count of [5, 10, 20]) expect(screen.getByTestId(`tr-count-${count}`)).toBeInTheDocument();
    for (const difficulty of ['basic', 'intermediate', 'hard']) {
      expect(screen.getByTestId(`tr-difficulty-${difficulty}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('tr-count-50')).not.toBeInTheDocument();
  });

  it('shoots at the exact correct hoop, gives feedback, and advances', async () => {
    const { container } = renderWithProviders(<BasketballMonkeyPage />);
    start();

    fireEvent.click(screen.getByTestId('tr-option-63'));
    await settleShot();

    const shell = container.querySelector('.basketball-shell')!;
    expect(shell).toHaveAttribute('data-shot-target', '63');
    expect(shell).toHaveAttribute('data-shot-result', 'correct');
    expect(screen.getByTestId('tr-option-63')).toHaveClass('tr-option-correct');
    expect(playSound).toHaveBeenCalledWith('fire');

    await act(async () => vi.advanceTimersByTime(450));
    expect(screen.getByTestId('tr-question')).toHaveTextContent('22 × 3');
  });

  it('animates a miss toward the chosen hoop and keeps shared wrong-answer behavior', async () => {
    const { container } = renderWithProviders(<BasketballMonkeyPage />);
    start();

    fireEvent.click(screen.getByTestId('tr-option-66'));
    await settleShot();

    expect(container.querySelector('.basketball-shell')).toHaveAttribute('data-shot-target', '66');
    expect(container.querySelector('.basketball-shell')).toHaveAttribute('data-shot-result', 'wrong');
    expect(screen.getByTestId('tr-option-66')).toHaveClass('tr-option-wrong');
    expect(screen.getByTestId('tr-option-63')).toHaveClass('tr-option-correct');

    await act(async () => vi.advanceTimersByTime(1200));
    expect(screen.getByTestId('tr-question')).toHaveTextContent('22 × 3');
  });

  it('completes a five-shot practice session through the shared results screen', async () => {
    renderWithProviders(<BasketballMonkeyPage />);
    start(5);

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByTestId(`tr-option-${(21 + index) * 3}`));
      await act(async () => vi.advanceTimersByTime(450));
    }

    expect(screen.getByTestId('tr-results')).toBeInTheDocument();
    expect(screen.getByText('5/5')).toBeInTheDocument();
  });

  it('uses the shared challenge streak and eligible question counts', () => {
    renderWithProviders(<BasketballMonkeyPage />);
    fireEvent.click(screen.getByTestId('tr-mode-challenge'));
    expect(screen.queryByTestId('tr-count-5')).not.toBeInTheDocument();
    expect(screen.getByTestId('tr-count-10')).toBeInTheDocument();
    expect(screen.getByTestId('tr-count-20')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tr-start'));
    expect(screen.getByTestId('tr-streak')).toBeInTheDocument();
  });

  it('renders Hebrew RTL while preserving LTR equation order', () => {
    const { container } = renderWithProviders(<App />, ['/grade/4/multiplication/basketball-monkey']);
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('קוף הכדורסל');
    start();
    expect(container.querySelector('.tr-fact')).toHaveTextContent('21 × 3 = ?');
  });

  it('renders translated English LTR copy', async () => {
    await useLanguage('en');
    renderWithProviders(<App />, ['/grade/4/multiplication/basketball-monkey']);
    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Basketball Monkey');
    expect(screen.getByText('Choose your training mode, difficulty, and number of shots.')).toBeInTheDocument();
  });
});
