import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { FRACTIONS_PART1_ACTIVITY_IDS } from '../../data/games/fractionsPart1Data';
import { fractionsPart1Games } from '../../data/games';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/testUtils';

afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('he');
});

describe('Fractions Part 1 activities', () => {
  it.each(FRACTIONS_PART1_ACTIVITY_IDS)('renders a functional visual scene for %s', (activityId) => {
    const { container } = renderWithProviders(<App />, [`/grade/4/fractions-part-1/${activityId}`]);
    expect(container.querySelector('.fp-scene')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getAllByRole('button').length).toBeGreaterThan(2);
  });

  it('keeps a wrong build in place, explains it, then advances after a correct retry', () => {
    vi.useFakeTimers();
    renderWithProviders(<App />, ['/grade/4/fractions-part-1/build-a-fraction']);
    const model = screen.getByTestId('fraction-direct-model');
    const pieces = model.querySelectorAll('[data-testid^="fraction-piece-"]');
    expect(pieces.length).toBeGreaterThanOrEqual(2);

    for (const piece of pieces) fireEvent.click(piece);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('fractionsPart1.actions.check') }));
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('fractionsPart1.feedback.retry'));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    for (let index = 1; index < pieces.length; index++) fireEvent.click(pieces[index]);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('fractionsPart1.actions.check') }));
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('fractionsPart1.feedback.correct'));
    act(() => vi.advanceTimersByTime(701));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('renders English and keeps stacked fraction math LTR', async () => {
    await i18n.changeLanguage('en');
    const { container } = renderWithProviders(<App />, ['/grade/4/fractions-part-1/numerator-denominator']);
    expect(screen.getByRole('heading', { name: 'Numerator and Denominator' })).toBeInTheDocument();
    expect(container.querySelector('.math-text.fraction')).toHaveAttribute('dir', 'ltr');
  });

  it('completes a full identify-fraction session', () => {
    vi.useFakeTimers();
    const { container } = renderWithProviders(<App />, ['/grade/4/fractions-part-1/find-the-fraction']);

    for (let round = 0; round < 6; round++) {
      const modelDock = container.querySelector('.fp-model-dock');
      let answer: string;
      if (modelDock) {
        answer = container.querySelector('.fp-prompt [role="math"]')!.getAttribute('aria-label')!;
      } else {
        const hero = container.querySelector('.fp-hero-model')!;
        const pieces = hero.querySelectorAll('[data-testid^="fraction-piece-"]');
        const selected = hero.querySelectorAll('[data-selected="true"]');
        answer = `${selected.length}/${pieces.length}`;
      }
      const answerMath = [...container.querySelectorAll('.fp-choice-dock [role="math"], .fp-model-dock [role="math"]')].find(
        (element) => element.getAttribute('aria-label') === answer,
      )!;
      fireEvent.click(answerMath.closest('button')!);
      act(() => vi.advanceTimersByTime(701));
    }

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(i18n.t('fractionsPart1.completion.title'));
  });

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

  it('never prints the marked fraction on the "which fraction is marked?" line', () => {
    vi.useFakeTimers();
    const { container } = renderWithProviders(<App />, ['/grade/4/fractions-part-1/fraction-number-line']);
    let readRounds = 0;

    for (let round = 0; round < 6; round++) {
      const line = container.querySelector('.fraction-number-line')!;
      const choiceDock = container.querySelector('.fp-choice-dock');

      if (choiceDock) {
        // "Which fraction is marked?" — the marker must be visible and unnamed.
        readRounds += 1;
        expect(line.querySelector('.fnl-point-marked')).toBeInTheDocument();
        expect(line.querySelectorAll('[role="math"]')).toHaveLength(0);
        // Only the 0 and 1 anchors and "?" placeholders — no fraction anywhere.
        expect(line.textContent).toMatch(/^0\?*1$/);

        for (const choice of [...choiceDock.querySelectorAll('button')]) {
          fireEvent.click(choice);
          if (screen.getByRole('status').textContent === i18n.t('fractionsPart1.feedback.correct')) break;
        }
      } else {
        const target = container.querySelector('.fp-prompt [role="math"]')!.getAttribute('aria-label')!;
        fireEvent.click(screen.getByRole('button', { name: target }));
      }
      act(() => vi.advanceTimersByTime(701));
    }

    expect(readRounds).toBeGreaterThan(0);
  });

  it.each(['he', 'en'])('keeps the comparison sign exactly as clicked in %s', async (language) => {
    await i18n.changeLanguage(language);
    const { container } = renderWithProviders(<App />, ['/grade/4/fractions-part-1/which-is-greater']);
    const comparison = container.querySelector('.fp-comparison')!;

    // Mathematical signs must never be bidi-mirrored the way a UI chevron is.
    expect(comparison).toHaveAttribute('dir', 'ltr');
    // The models carry no numbers: reading them is the task.
    expect(comparison.querySelectorAll('.fp-visual-fraction [role="math"]')).toHaveLength(0);

    const buttons = [...container.querySelectorAll('.fp-choice-dock button')] as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent)).toEqual(['<', '>', '=']);

    for (const button of buttons) {
      const symbol = button.textContent;
      fireEvent.click(button);
      expect(button.textContent).toBe(symbol);
      expect(buttons.map((other) => other.textContent)).toEqual(['<', '>', '=']);
      expect(container.querySelector('.fp-comparison-slot')).toHaveTextContent(symbol!);
      expect(container.querySelector('.fp-comparison-slot .math-text')).toHaveAttribute('dir', 'ltr');
      if (screen.getByRole('status').textContent === i18n.t('fractionsPart1.feedback.correct')) break;
    }
  });
});
