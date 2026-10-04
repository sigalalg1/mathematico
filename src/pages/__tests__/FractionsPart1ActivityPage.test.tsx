import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { FRACTIONS_PART1_ACTIVITY_IDS } from '../../data/games/fractionsPart1Data';
import {
  FRACTION_TRAINING_ACTIVITY_IDS,
  isFractionTrainingActivity,
} from '../../data/games/fractionsPart1Training';
import { fractionsPart1Games } from '../../data/games';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/testUtils';

/** Longest feedback pause the training engine holds before the next question. */
const FEEDBACK_MS = 1201;

afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('he');
});

/** Walks the shared training setup screen and starts a round. */
function startTraining(
  activityId: string,
  { difficulty = 'basic', count = 5 }: { difficulty?: string; count?: number } = {},
) {
  const rendered = renderWithProviders(<App />, [`/grade/4/fractions-part-1/${activityId}`]);
  fireEvent.click(screen.getByTestId(`tr-difficulty-${difficulty}`));
  fireEvent.click(screen.getByTestId(`tr-count-${count}`));
  fireEvent.click(screen.getByTestId('tr-start'));
  return rendered;
}

/**
 * Answers whatever the current fraction question happens to be, without
 * knowing the right answer — these tests are about the flow and the leak
 * rules, never about guessing correctly. A wrong guess no longer ends the
 * question by itself (the child gets it back to correct in place), so this
 * keeps trying a fresh candidate each round until the session actually moves
 * on — guaranteed within a few attempts since every question has a small,
 * fixed set of candidates and none of them are ever removed by a miss.
 */
async function answerAnyhow(container: HTMLElement) {
  const progress = () => screen.queryByRole('progressbar')?.getAttribute('aria-valuenow');
  const before = progress();

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const dockButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.fp-choice-dock button, .fp-model-dock button'),
    ).filter((button) => !button.disabled);

    if (dockButtons.length > 0) {
      fireEvent.click(dockButtons[attempt % dockButtons.length]);
    } else {
      const check = container.querySelector<HTMLButtonElement>('.fp-check');
      if (check) {
        // Clear any current shading, then shade exactly `attempt + 1` pieces —
        // only the count is ever submitted, never which pieces were chosen.
        const pieces = Array.from(
          container.querySelectorAll<HTMLElement>('[data-testid^="fraction-piece-"], .fraction-collection button'),
        );
        pieces.forEach((piece) => {
          if (piece.getAttribute('aria-pressed') === 'true') fireEvent.click(piece);
        });
        for (let i = 0; i <= attempt && i < pieces.length; i += 1) fireEvent.click(pieces[i]);
        if (!check.disabled) fireEvent.click(check);
      } else {
        const points = Array.from(container.querySelectorAll<HTMLButtonElement>('.fraction-number-line button'));
        if (points.length === 0) return; // Nothing interactive on screen to answer.
        fireEvent.click(points[attempt % points.length]);
      }
    }

    await act(async () => {
      vi.advanceTimersByTime(FEEDBACK_MS);
    });

    if (progress() !== before || screen.queryByTestId('tr-results')) return;
  }

  throw new Error('answerAnyhow: exhausted attempts without the session advancing');
}

describe('Fractions Part 1 activities', () => {
  it.each(FRACTION_TRAINING_ACTIVITY_IDS)('offers practice depth and a timed personal challenge for %s', (activityId) => {
    renderWithProviders(<App />, [`/grade/4/fractions-part-1/${activityId}`]);

    for (const difficulty of ['basic', 'intermediate', 'hard']) {
      expect(screen.getByTestId(`tr-difficulty-${difficulty}`)).toBeInTheDocument();
    }
    for (const count of [5, 10, 20]) {
      expect(screen.getByTestId(`tr-count-${count}`)).toBeInTheDocument();
    }

    expect(screen.getByTestId('tr-mode-practice')).toBeInTheDocument();
    expect(screen.getByTestId('tr-mode-challenge')).toBeInTheDocument();

    // The shortest length stays practice-only, matching Multiplication Tables.
    fireEvent.click(screen.getByTestId('tr-mode-challenge'));
    expect(screen.queryByTestId('tr-count-5')).not.toBeInTheDocument();
    expect(screen.getByTestId('tr-count-10')).toBeInTheDocument();
    expect(screen.getByTestId('tr-count-20')).toBeInTheDocument();
  });

  it.each(FRACTIONS_PART1_ACTIVITY_IDS)('renders a functional visual scene for %s', (activityId) => {
    const { container } = isFractionTrainingActivity(activityId)
      ? startTraining(activityId)
      : renderWithProviders(<App />, [`/grade/4/fractions-part-1/${activityId}`]);

    expect(container.querySelector('.fp-scene')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(2);
  });

  it('runs a fixed round, not a configurable one, for the closing challenge', () => {
    const { container } = renderWithProviders(<App />, ['/grade/4/fractions-part-1/fractions-challenge']);
    expect(screen.queryByTestId('tr-start')).not.toBeInTheDocument();
    expect(container.querySelector('.fp-scene')).toBeInTheDocument();
  });

  it('scores a wrong answer, requires a retry, and reports accuracy at the end', async () => {
    vi.useFakeTimers();
    const { container } = startTraining('build-a-fraction', { count: 5 });

    // Selecting every piece of the whole cannot be the answer: the target is a
    // proper fraction, so this first answer is deliberately wrong.
    const model = screen.getByTestId('fraction-direct-model');
    for (const piece of model.querySelectorAll('[data-testid^="fraction-piece-"]')) fireEvent.click(piece);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('fractionsPart1.actions.check') }));

    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('training.feedback.wrongLabel'));
    act(() => vi.advanceTimersByTime(FEEDBACK_MS));

    // Still question 1 — the mistake handed it back for a retry instead of
    // carrying the child past their own wrong answer.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('training.feedback.wrongLabel'));

    // Resolving that retry and the remaining four questions is five advances.
    for (let advance = 0; advance < 5; advance++) {
      await answerAnyhow(container);
    }

    const results = screen.getByTestId('tr-results');
    expect(results).toBeInTheDocument();
    // Accuracy out of the chosen session length — never a time or a pace.
    expect(results.textContent).toContain('/5');
    expect(results.textContent).not.toContain(i18n.t('training.results.paceUnit'));
  });

  it.each([5, 10, 20])('runs a full %i-question session', async (count) => {
    vi.useFakeTimers();
    const { container } = startTraining('find-the-fraction', { difficulty: 'intermediate', count });

    for (let question = 1; question <= count; question++) {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(count));
      await answerAnyhow(container);
    }

    expect(screen.getByTestId('tr-results').textContent).toContain(`/${count}`);
  });

  it('renders English and keeps stacked fraction math LTR', async () => {
    await i18n.changeLanguage('en');
    const { container } = startTraining('numerator-denominator');
    expect(screen.getByRole('heading', { name: 'Numerator and Denominator' })).toBeInTheDocument();
    expect(container.querySelector('.math-text.fraction')).toHaveAttribute('dir', 'ltr');
  });

  it.each(['basic', 'intermediate', 'hard'])(
    'never prints the marked fraction on the number line at %s',
    async (difficulty) => {
      vi.useFakeTimers();
      const { container } = startTraining('fraction-number-line', { difficulty, count: 20 });
      let readRounds = 0;

      for (let question = 1; question <= 20; question++) {
        const line = container.querySelector('.fraction-number-line')!;
        const choiceDock = container.querySelector('.fp-choice-dock');

        if (choiceDock) {
          // "Which fraction is marked?" — the marker must be visible and unnamed.
          readRounds += 1;
          expect(line.querySelector('.fnl-point-marked')).toBeInTheDocument();
          expect(line.querySelectorAll('[role="math"]')).toHaveLength(0);
          // Only the 0 and 1 anchors and "?" placeholders — no fraction anywhere.
          expect(line.textContent).toMatch(/^0\?*1$/);
        }

        await answerAnyhow(container);
      }

      expect(readRounds).toBeGreaterThan(0);
    },
  );

  it.each(['he', 'en'])('keeps the comparison sign exactly as clicked in %s', async (language) => {
    await i18n.changeLanguage(language);
    const { container } = startTraining('which-is-greater', { difficulty: 'hard' });
    const comparison = container.querySelector('.fp-comparison')!;

    // Mathematical signs must never be bidi-mirrored the way a UI chevron is.
    expect(comparison).toHaveAttribute('dir', 'ltr');
    // The models carry no numbers: reading them is the task.
    expect(comparison.querySelectorAll('.fp-visual-fraction [role="math"]')).toHaveLength(0);

    const buttons = [...container.querySelectorAll('.fp-choice-dock button')] as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent)).toEqual(['<', '>', '=']);

    const symbol = buttons[0].textContent;
    fireEvent.click(buttons[0]);
    expect(buttons.map((other) => other.textContent)).toEqual(['<', '>', '=']);
    expect(container.querySelector('.fp-comparison-slot')).toHaveTextContent(symbol!);
    expect(container.querySelector('.fp-comparison-slot .math-text')).toHaveAttribute('dir', 'ltr');
  });

  it.each(['basic', 'intermediate', 'hard'])(
    'never labels the two compared models at %s',
    async (difficulty) => {
      vi.useFakeTimers();
      const { container } = startTraining('which-is-greater', { difficulty, count: 20 });

      for (let question = 1; question <= 20; question++) {
        const comparison = container.querySelector('.fp-comparison')!;
        expect(comparison).toHaveAttribute('dir', 'ltr');
        // Not one fraction is named anywhere between the two models.
        expect(comparison.querySelectorAll('[role="math"]')).toHaveLength(0);
        expect(comparison.textContent).toBe('?');
        expect(container.querySelector('.fp-comparison-slot')).toHaveTextContent('?');
        await answerAnyhow(container);
      }
    },
  );

  it('exposes the complete ordered unit in Hebrew', () => {
    renderWithProviders(<App />, ['/grade/4/fractions-part-1']);
    const tiles = screen.getAllByRole('link').filter((link) => link.classList.contains('atile'));
    const listed = fractionsPart1Games.filter((game) => game.enabled).map((game) => game.id);
    expect(tiles).toHaveLength(listed.length);
    listed.forEach((activityId, index) => {
      expect(tiles[index].querySelector('.atile-index')).toHaveTextContent(`${index + 1}.`);
      expect(tiles[index].querySelector('.atile-title')).toHaveTextContent(
        i18n.t(`fractionsPart1.activities.${activityId}.name`),
      );
    });
  });
});
