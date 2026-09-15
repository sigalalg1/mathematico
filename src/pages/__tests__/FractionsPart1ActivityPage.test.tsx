import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { FRACTIONS_PART1_ACTIVITY_IDS } from '../../data/games/fractionsPart1Data';
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
    FRACTIONS_PART1_ACTIVITY_IDS.forEach((activityId, index) => {
      expect(screen.getByText(`${index + 1}. ${i18n.t(`fractionsPart1.activities.${activityId}.name`)}`)).toBeInTheDocument();
    });
  });
});
