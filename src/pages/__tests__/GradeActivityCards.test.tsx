import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import App from '../../App';
import i18n from '../../i18n';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import {
  coordinateSystemGames,
  fractionsPart1Games,
  geometryAnglesTrianglesGames,
  multiplicationGames,
} from '../../data/games';
import { PASTEL_TONES, toneForIndex } from '../../components/activityTones';

/**
 * The grades 3–4 activity listings use the colourful pastel tiles. Grade 7 and
 * the grade selection screen must keep the dark `Card` rows untouched, so the
 * regression checks below live alongside the new-look assertions.
 */

function tiles() {
  return screen.getAllByRole('link').filter((link) => link.classList.contains('atile'));
}

afterEach(async () => {
  await resetLanguage();
});

describe('grade 3–4 colourful activity tiles', () => {
  it('renders every Fractions Part 1 activity as a linked pastel tile', () => {
    renderWithProviders(<App />, ['/grade/4/fractions-part-1']);
    const cards = tiles();

    expect(cards).toHaveLength(fractionsPart1Games.length);
    cards.forEach((card, index) => {
      const game = fractionsPart1Games[index];
      expect(card).toHaveAttribute('href', game.path!);
      expect(card.querySelector('.atile-title')).toHaveTextContent(i18n.t(game.nameKey));
      expect(card.querySelector('.atile-description')).toHaveTextContent(i18n.t(game.descriptionKey));
      // Topic-specific glyph, numbered badge and the continue affordance.
      expect(card.querySelector('.atile-icon svg')).toBeInTheDocument();
      expect(card.querySelector('.atile-index')).toHaveTextContent(`${index + 1}.`);
      expect(card.querySelector('.atile-arrow svg')).toBeInTheDocument();
      expect(card.classList.contains(`atile-${toneForIndex(index)}`)).toBe(true);
    });
  });

  it('never repeats a pastel tint on two adjacent tiles', () => {
    renderWithProviders(<App />, ['/grade/3/geometry-angles-triangles']);
    const tones = tiles().map(
      (card) => PASTEL_TONES.find((tone) => card.classList.contains(`atile-${tone}`))!,
    );

    expect(tones).toHaveLength(geometryAnglesTrianglesGames.length);
    expect(tones.every(Boolean)).toBe(true);
    tones.forEach((tone, index) => {
      if (index > 0) expect(tone).not.toBe(tones[index - 1]);
    });
  });

  it('renders every Grade 3 geometry activity with translated copy, not raw keys', () => {
    renderWithProviders(<App />, ['/grade/3/geometry-angles-triangles']);
    const cards = tiles();

    expect(cards).toHaveLength(geometryAnglesTrianglesGames.length);
    cards.forEach((card, index) => {
      const game = geometryAnglesTrianglesGames[index];
      expect(card).toHaveAttribute('href', game.path!);
      expect(card.textContent).toContain(i18n.t(game.nameKey));
      expect(card.textContent).not.toContain('geometry.activities.');
    });
  });

  it('gives the multiplication listing the same treatment', () => {
    renderWithProviders(<App />, ['/grade/4/multiplication']);
    const cards = tiles();

    expect(cards).toHaveLength(multiplicationGames.length);
    expect(cards[0]).toHaveAttribute('href', multiplicationGames[0].path!);
    expect(screen.getByText(i18n.t('multiplicationPage.listIntro'))).toBeInTheDocument();
  });

  it('shows the encouragement banner with real destinations only', () => {
    renderWithProviders(<App />, ['/grade/4/fractions-part-1']);

    expect(screen.getByText(i18n.t('activityList.bannerTitle'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: i18n.t('activityList.progressLink') })).toHaveAttribute(
      'href',
      '/activity',
    );
    // Reuses the existing back destination rather than inventing a route.
    const backLinks = screen
      .getAllByRole('link', { name: i18n.t('nav.grade4Topics') })
      .map((link) => link.getAttribute('href'));
    expect(backLinks).toContain('/grade/4');
  });

  it('renders the same listing in English without layout-breaking fallbacks', async () => {
    await useLanguage('en');
    renderWithProviders(<App />, ['/grade/4/fractions-part-1']);

    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Fractions – Part 1');
    expect(screen.getByText(i18n.t('activityList.bannerTitle'))).toBeInTheDocument();
    tiles().forEach((card, index) => {
      expect(card.querySelector('.atile-title')).toHaveTextContent(
        i18n.t(fractionsPart1Games[index].nameKey),
      );
    });
  });

  it('keeps Hebrew as the default RTL rendering for the listing', () => {
    renderWithProviders(<App />, ['/grade/3/geometry-angles-triangles']);

    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('geometry.unitName'));
    // The numbered badge stays LTR so "10." never flips to ".10".
    expect(tiles()[9].querySelector('.atile-index')).toHaveAttribute('dir', 'ltr');
  });
});

describe('regression: screens outside grades 3–4 keep the dark card', () => {
  it('leaves the Grade 7 coordinate-system topic list on the dark row cards', () => {
    const { container } = renderWithProviders(<App />, ['/grade/7/coordinate-system']);

    expect(container.querySelectorAll('.atile')).toHaveLength(0);
    const rows = container.querySelectorAll('.card.card-row');
    expect(rows).toHaveLength(coordinateSystemGames.length);
    expect(container.querySelector('.card-chevron')).toBeInTheDocument();
  });

  it('leaves a Grade 7 game page untouched', () => {
    const { container } = renderWithProviders(<App />, ['/grade/7/coordinate-system/hit-the-target']);

    expect(container.querySelectorAll('.atile')).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('games.hitTheTarget.name'));
  });

  it('leaves the grade selection home page untouched', () => {
    const { container } = renderWithProviders(<App />, ['/']);

    expect(container.querySelectorAll('.atile')).toHaveLength(0);
    expect(container.querySelectorAll('.card').length).toBeGreaterThan(0);
  });

  it('leaves the Grade 4 topic selector on the dark row cards', () => {
    const { container } = renderWithProviders(<App />, ['/grade/4']);

    expect(container.querySelectorAll('.atile')).toHaveLength(0);
    expect(container.querySelectorAll('.card.card-row').length).toBeGreaterThan(0);
  });
});
