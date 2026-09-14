import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { HitTheTargetPage } from '../HitTheTargetPage';

// A deterministic two-target stage so the test can answer known coordinates.
vi.mock('../../data/games/hitTheTargetStages', () => ({
  hitTheTargetStages: [
    { id: 'stage1', nameKey: 'hitTheTarget.stages.stage1.name', introKey: 'hitTheTarget.stages.stage1.intro', count: 2 },
  ],
  HIT_THE_TARGET_RANGE_MIN: -5,
  HIT_THE_TARGET_RANGE_MAX: 5,
  HIT_THE_TARGET_TOTAL: 2,
  generateTarget: () => ({ x: 2, y: 3 }),
  buildStageTargets: () => [
    { x: 2, y: 3 },
    { x: -1, y: 4 },
  ],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

function inputs() {
  return screen.getAllByRole('textbox') as HTMLInputElement[];
}

function fireButton() {
  return screen.getByRole('button', { name: t('hitTheTarget.actions.fire') });
}

function shoot(x: string, y: string) {
  const [xInput, yInput] = inputs();
  fireEvent.change(xInput, { target: { value: x } });
  fireEvent.change(yInput, { target: { value: y } });
  fireEvent.click(fireButton());
  act(() => {
    vi.advanceTimersByTime(200);
  });
}

describe('Hit the Target', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the prompt, a coordinate plane, X and Y inputs and a fire button', () => {
    renderWithProviders(<HitTheTargetPage />);
    expect(screen.getByText(t('hitTheTarget.prompt'))).toBeInTheDocument();
    expect(inputs()).toHaveLength(2);
    expect(fireButton()).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('labels the X and Y inputs accessibly and keeps them in X-then-Y visual order', () => {
    const { container } = renderWithProviders(<HitTheTargetPage />);
    expect(screen.getByLabelText(t('hitTheTarget.inputs.x'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('hitTheTarget.inputs.y'))).toBeInTheDocument();
    // The pair is forced LTR so RTL Hebrew does not flip X and Y around.
    expect(container.querySelector('.hit-the-target-inputs')).toHaveAttribute('dir', 'ltr');
  });

  it('does not advance after a wrong answer and lets the student try again in place', () => {
    renderWithProviders(<HitTheTargetPage />);
    shoot('5', '5');

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    // Regression guard: the inputs must stay usable after a miss.
    for (const input of inputs()) expect(input).not.toBeDisabled();
    expect(fireButton()).not.toBeDisabled();

    shoot('2', '3');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('gives a targeted hint when the student swaps X and Y', () => {
    renderWithProviders(<HitTheTargetPage />);
    shoot('3', '2');
    expect(screen.getByText(t('hitTheTarget.feedback.swapped'))).toBeInTheDocument();
  });

  it('gives a targeted hint for an X sign error', () => {
    renderWithProviders(<HitTheTargetPage />);
    shoot('-2', '3');
    const expected = t('hitTheTarget.feedback.xSign', {
      direction: t('hitTheTarget.words.right'),
      sign: t('hitTheTarget.words.positive'),
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('advances on a correct answer and shows the completion screen after the last target', () => {
    renderWithProviders(<HitTheTargetPage />);
    shoot('2', '3');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    shoot('-1', '4');
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByText(t('hitTheTarget.completion.title'))).toBeInTheDocument();
    expect(screen.getByText(t('hitTheTarget.completion.firstTry', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('hitTheTarget.actions.playAgain') })).toBeInTheDocument();
  });

  it('starts a fresh round from the completion screen', () => {
    renderWithProviders(<HitTheTargetPage />);
    shoot('2', '3');
    act(() => vi.advanceTimersByTime(700));
    shoot('-1', '4');
    act(() => vi.advanceTimersByTime(700));

    fireEvent.click(screen.getByRole('button', { name: t('hitTheTarget.actions.playAgain') }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(inputs()[0]).toHaveValue('');
  });

  it('exposes a labelled sound toggle that flips state and persists the preference', () => {
    renderWithProviders(<HitTheTargetPage />);
    const toggle = screen.getByRole('button', { name: t('common.soundOn') });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: t('common.soundOff') })).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('mathematico-sound-enabled')).toBe('false');
  });
});
