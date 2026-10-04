import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/testUtils';
import i18n from '../i18n';
import App from '../App';
import {
  arithmeticFluencyGames,
  coordinateSystemGames,
  divisionWithRemainderGames,
  findGame,
  fractionsPart1Games,
  geometryAnglesTrianglesGames,
  multiplicationGames,
  signedNumbersGames,
  simpleFractionsGames,
} from '../data/games';

const STATIC_ROUTES = [
  '/',
  '/grade/2',
  '/grade/2/arithmetic-fluency',
  '/grade/3',
  '/grade/3/geometry-angles-triangles',
  '/grade/4',
  '/grade/4/division-with-remainder',
  '/grade/4/multiplication',
  '/grade/4/simple-fractions',
  '/grade/4/fractions-part-1',
  '/grade/4/penalty-shootout',
  '/grade/7',
  '/grade/7/coordinate-system',
  '/grade/7/signed-numbers',
  '/account',
  '/activity',
];
const GAME_ROUTES = [
  ...arithmeticFluencyGames,
  ...geometryAnglesTrianglesGames,
  ...coordinateSystemGames,
  ...signedNumbersGames,
  ...divisionWithRemainderGames,
  ...multiplicationGames,
  ...simpleFractionsGames,
  ...fractionsPart1Games,
].map((game) => game.path!);
const ALL_ROUTES = [...STATIC_ROUTES, ...GAME_ROUTES];

describe('routing smoke tests', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('registers a route for every enabled game in the topic registry', () => {
    expect(geometryAnglesTrianglesGames).toHaveLength(12);
    expect(geometryAnglesTrianglesGames.every((game) => game.path?.startsWith('/grade/3/geometry-angles-triangles/'))).toBe(true);
    for (const game of coordinateSystemGames) {
      expect(game.enabled).toBe(true);
      expect(game.path).toMatch(/^\/grade\/7\/coordinate-system\//);
    }
    expect(arithmeticFluencyGames.map((game) => game.id)).toEqual([
      'arithmeticFactsTo20',
      'arithmeticTwoDigitPlain',
      'arithmeticAdditionRegrouping',
      'arithmeticSubtractionRegrouping',
    ]);
    for (const game of arithmeticFluencyGames) {
      expect(game.enabled).toBe(true);
      expect(game.path).toMatch(/^\/grade\/2\/arithmetic-fluency\//);
    }
    expect(divisionWithRemainderGames).toEqual([]);
    expect(simpleFractionsGames).toEqual([]);
    expect(multiplicationGames.map((game) => game.id)).toEqual([
      'multiplicationTables',
      'monkeyBalloonShooter',
      'basketballMonkey',
    ]);
    expect(new Set(GAME_ROUTES).size).toBe(GAME_ROUTES.length);
  });

  it.each(ALL_ROUTES)('renders %s without crashing and with a page heading', (route) => {
    renderWithProviders(<App />, [route]);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it.each(ALL_ROUTES)('renders %s with no React warnings or errors', (route) => {
    renderWithProviders(<App />, [route]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it.each(GAME_ROUTES)('renders %s again in English without crashing', async (route) => {
    await i18n.changeLanguage('en');
    try {
      renderWithProviders(<App />, [route]);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      await i18n.changeLanguage('he');
    }
  });

  it('redirects a grade with no content yet back to the home page', () => {
    // Grade 1 is a known id with nothing behind it; grade 2 now has a real unit.
    renderWithProviders(<App />, ['/grade/1']);
    expect(screen.getByRole('heading', { level: 1, name: i18n.t('app.title') })).toBeInTheDocument();
  });

  it('shows the Grade 4 division game as a card on its topic page', () => {
    renderWithProviders(<App />, ['/grade/4/division-with-remainder']);
    for (const game of divisionWithRemainderGames) {
      expect(screen.getByText(i18n.t(game.nameKey) as string)).toBeInTheDocument();
    }
  });

  it('shows the Grade 4 fractions game as a card on its topic page', () => {
    renderWithProviders(<App />, ['/grade/4/simple-fractions']);
    for (const game of simpleFractionsGames) {
      expect(screen.getByText(i18n.t(game.nameKey) as string)).toBeInTheDocument();
    }
  });

  it('shows the listed Fractions Part 1 activities in order, without the disabled one', () => {
    renderWithProviders(<App />, ['/grade/4/fractions-part-1']);
    const tiles = screen.getAllByRole('link').filter((link) => link.classList.contains('atile'));
    const listed = fractionsPart1Games.filter((game) => game.enabled);
    expect(listed).toHaveLength(fractionsPart1Games.length - 1);
    expect(tiles).toHaveLength(listed.length);
    listed.forEach((game, index) => {
      expect(tiles[index].querySelector('.atile-index')).toHaveTextContent(`${index + 1}.`);
      expect(tiles[index].querySelector('.atile-title')).toHaveTextContent(i18n.t(game.nameKey));
      expect(tiles[index]).toHaveAttribute('href', game.path!);
    });
  });

  it('shows the Grade 4 multiplication game as a card on its topic page', () => {
    renderWithProviders(<App />, ['/grade/4/multiplication']);
    for (const game of multiplicationGames) {
      expect(screen.getByText(i18n.t(game.nameKey) as string)).toBeInTheDocument();
    }
  });

  it('registers a route for every enabled signed numbers game in the topic registry', () => {
    for (const game of signedNumbersGames) {
      expect(game.enabled).toBe(true);
      expect(game.path).toMatch(/^\/grade\/7\/signed-numbers\//);
    }
  });

  it('shows every signed numbers game as a card on the topic page', () => {
    renderWithProviders(<App />, ['/grade/7/signed-numbers']);
    for (const game of signedNumbersGames) {
      expect(screen.getByText(i18n.t(game.nameKey) as string)).toBeInTheDocument();
    }
  });

  it('offers both Grade 7 topics on the grade page', () => {
    renderWithProviders(<App />, ['/grade/7']);
    expect(screen.getByText(i18n.t('topics.coordinateSystem.name') as string)).toBeInTheDocument();
    expect(screen.getByText(i18n.t('topics.signedNumbers.name') as string)).toBeInTheDocument();
  });

  it('shows every coordinate system game as a card on the topic page', () => {
    renderWithProviders(<App />, ['/grade/7/coordinate-system']);
    for (const game of coordinateSystemGames) {
      expect(screen.getByText(i18n.t(game.nameKey) as string)).toBeInTheDocument();
    }
  });

  it('keeps the empty Grade 4 units out of the topic list while their routes survive', () => {
    const { unmount } = renderWithProviders(<App />, ['/grade/4']);
    for (const topicId of ['divisionWithRemainder', 'simpleFractions']) {
      expect(screen.queryByText(i18n.t(`topics.${topicId}.name`) as string)).not.toBeInTheDocument();
    }
    expect(screen.getByText(i18n.t('topics.fractionsPart1.name') as string)).toBeInTheDocument();
    unmount();

    // Hidden, not deleted: the pages still resolve if a stored link points there.
    for (const path of ['/grade/4/division-with-remainder', '/grade/4/simple-fractions']) {
      const view = renderWithProviders(<App />, [path]);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      view.unmount();
    }
  });

  it('hides "Build the Whole" from the Fractions Part 1 list but keeps it resolvable', () => {
    const buildTheWhole = fractionsPart1Games.find((game) => game.id === 'build-the-whole')!;
    expect(buildTheWhole.enabled).toBe(false);
    expect(findGame('build-the-whole')).toBe(buildTheWhole);

    renderWithProviders(<App />, ['/grade/4/fractions-part-1']);
    expect(screen.queryByText(i18n.t(buildTheWhole.nameKey) as string)).not.toBeInTheDocument();
  });
});
