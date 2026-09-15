import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/testUtils';
import i18n from '../i18n';
import App from '../App';
import {
  coordinateSystemGames,
  divisionWithRemainderGames,
  fractionsPart1Games,
  multiplicationGames,
  simpleFractionsGames,
} from '../data/games';

const STATIC_ROUTES = [
  '/',
  '/grade/4',
  '/grade/4/division-with-remainder',
  '/grade/4/multiplication',
  '/grade/4/simple-fractions',
  '/grade/4/fractions-part-1',
  '/grade/4/penalty-shootout',
  '/grade/7',
  '/grade/7/coordinate-system',
  '/account',
  '/activity',
];
const GAME_ROUTES = [
  ...coordinateSystemGames,
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
    renderWithProviders(<App />, ['/grade/3']);
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
    fractionsPart1Games.forEach((game, index) => {
      expect(screen.getByText(`${index + 1}. ${i18n.t(game.nameKey)}`)).toBeInTheDocument();
    });
  });

  it('shows the Grade 4 multiplication game as a card on its topic page', () => {
    renderWithProviders(<App />, ['/grade/4/multiplication']);
    for (const game of multiplicationGames) {
      expect(screen.getByText(i18n.t(game.nameKey) as string)).toBeInTheDocument();
    }
  });

  it('shows every coordinate system game as a card on the topic page', () => {
    renderWithProviders(<App />, ['/grade/7/coordinate-system']);
    for (const game of coordinateSystemGames) {
      expect(screen.getByText(i18n.t(game.nameKey) as string)).toBeInTheDocument();
    }
  });
});
