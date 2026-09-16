import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/testUtils';
import i18n from '../i18n';
import App from '../App';
import {
  coordinateSystemGames,
  divisionWithRemainderGames,
  fractionsPart1Games,
  geometryAnglesTrianglesGames,
  multiplicationGames,
  signedNumbersGames,
  simpleFractionsGames,
} from '../data/games';

const STATIC_ROUTES = [
  '/',
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
    expect(divisionWithRemainderGames).toEqual([]);
    expect(simpleFractionsGames).toEqual([]);
    expect(multiplicationGames.map((game) => game.id)).toEqual(['monkeyBalloonShooter']);
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

  it('redirects an unknown grade back to the home page', () => {
    renderWithProviders(<App />, ['/grade/2']);
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

  it('shows all ten ordered activities on the Fractions Part 1 page', () => {
    renderWithProviders(<App />, ['/grade/4/fractions-part-1']);
    const tiles = screen.getAllByRole('link').filter((link) => link.classList.contains('atile'));
    expect(tiles).toHaveLength(fractionsPart1Games.length);
    fractionsPart1Games.forEach((game, index) => {
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
});
