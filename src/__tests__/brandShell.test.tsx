import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import i18n from '../i18n';
import { renderWithProviders, resetLanguage, useLanguage } from '../test/testUtils';
import { allGames } from '../data/games';

/**
 * Covers the Mathletica shell redesign: brand copy, both reading directions,
 * and that every kind of activity is still reachable by navigating the UI
 * (rather than by jumping straight to a URL).
 */
describe('Mathletica shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    await resetLanguage();
  });

  it('renders the Hebrew home screen with the brand lockup and grade choices', () => {
    renderWithProviders(<App />, ['/']);

    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('מתלטיקה');
    expect(screen.getByText('מתמטיקה קלה יותר')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /כיתה ז'/ })).toHaveAttribute('href', '/grade/7');
  });

  it('renders the English home screen with the English wordmark', async () => {
    await useLanguage('en');
    renderWithProviders(<App />, ['/']);

    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('Mathletica');
    expect(screen.getByText('Math made lighter.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Grade 4/ })).toHaveAttribute('href', '/grade/4');
  });

  it('drives the document direction from the language: Hebrew RTL, English LTR', async () => {
    renderWithProviders(<App />, ['/']);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');

    await useLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('keeps the primary call to action pointing at a real destination', () => {
    renderWithProviders(<App />, ['/']);

    const cta = screen.getByRole('link', { name: new RegExp(i18n.t('app.startTraining')) });
    expect(cta).toHaveAttribute('href', '/grade/3');
  });

  it('navigates home → grade 7 → coordinate system → an activity', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, ['/']);

    await user.click(screen.getByRole('link', { name: /כיתה ז'/ }));
    await user.click(screen.getByRole('link', { name: new RegExp(i18n.t('topics.coordinateSystem.name')) }));
    await user.click(screen.getByRole('link', { name: new RegExp(i18n.t('games.hitTheTarget.name')) }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('games.hitTheTarget.name'));
  });

  it('keeps Grade 4 activities reachable, including the Monkey Balloon Shooter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, ['/grade/4']);

    await user.click(screen.getByRole('link', { name: new RegExp(i18n.t('topics.multiplication.name')) }));
    await user.click(screen.getByRole('link', { name: new RegExp(i18n.t('monkeyBalloonShooter.gameName')) }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('monkeyBalloonShooter.gameName'));
  });

  it('keeps the penalty shootout reachable from its grade page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, ['/grade/4']);

    await user.click(screen.getByRole('link', { name: new RegExp(i18n.t('topics.penaltyShootout.name')) }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t('penaltyShootout.gameName'));
  });

  it('keeps the Grade 4 fraction activities reachable (the app has no Fraction Balloons game)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, ['/grade/4']);

    await user.click(screen.getByRole('link', { name: new RegExp(i18n.t('topics.fractionsPart1.name')) }));
    expect(screen.getByRole('link', { name: /^1\./ })).toBeInTheDocument();
    expect(allGames.some((game) => game.id === 'fractionBalloons')).toBe(false);
  });

  it('shows the grade as a context pill on inner screens', () => {
    renderWithProviders(<App />, ['/grade/7/coordinate-system']);
    expect(screen.getByText("כיתה ז'")).toBeInTheDocument();
  });

  it('offers the real navigation destinations only — activity and account', () => {
    renderWithProviders(<App />, ['/']);

    const nav = screen.getByRole('navigation', { name: i18n.t('nav.accountNavLabel') });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/activity', '/account']);
  });
});
