import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n, { getDirection, supportedLanguages } from '../index';
import en from '../locales/en/translation.json';
import he from '../locales/he/translation.json';
import App from '../../App';
import { coordinateSystemGames, divisionWithRemainderGames, multiplicationGames, simpleFractionsGames } from '../../data/games';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function leafPaths(value: Json, prefix = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => leafPaths(item, `${prefix}.${i}`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

function structure(value: Json): Json {
  if (Array.isArray(value)) return value.map(structure);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, structure((value as Record<string, Json>)[key])]),
    );
  }
  return typeof value;
}

const EN_PATHS = leafPaths(en as Json);
const ROUTES = [
  '/',
  '/grade/4',
  '/grade/4/division-with-remainder',
  '/grade/4/multiplication',
  '/grade/4/simple-fractions',
  '/grade/4/penalty-shootout',
  '/grade/7',
  '/grade/7/coordinate-system',
  ...coordinateSystemGames.map((g) => g.path!),
  ...divisionWithRemainderGames.map((g) => g.path!),
  ...multiplicationGames.map((g) => g.path!),
  ...simpleFractionsGames.map((g) => g.path!),
];

afterEach(async () => {
  await i18n.changeLanguage('he');
});

describe('translations', () => {
  it('supports Hebrew and English with Hebrew as the RTL default', () => {
    expect(supportedLanguages).toEqual(['he', 'en']);
    expect(getDirection('he')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
    expect(getDirection('fr')).toBe('ltr');
  });

  it('has exactly the same key structure in Hebrew and English', () => {
    expect(structure(he as Json)).toEqual(structure(en as Json));
  });

  it('has no empty English string where Hebrew has content, or vice versa', () => {
    const skip = new Set(['shapesOnPlane.stages.stage1.intro', 'hitTheTarget.stages.stage1.intro']);
    for (const path of EN_PATHS) {
      if (skip.has(path)) continue;
      const enValue = i18n.getResource('en', 'translation', path);
      const heValue = i18n.getResource('he', 'translation', path);
      if (typeof enValue !== 'string' || typeof heValue !== 'string') continue;
      expect(`${path}: ${enValue.length > 0}`).toBe(`${path}: ${heValue.length > 0}`);
    }
  });

  it.each(ROUTES)('renders %s in Hebrew with no untranslated keys leaking into the UI', async (route) => {
    await i18n.changeLanguage('he');
    const { container } = renderWithProviders(<App />, [route]);
    const text = container.textContent ?? '';
    const leaked = EN_PATHS.filter((path) => path.includes('.') && text.includes(path));
    expect(leaked).toEqual([]);
  });

  it.each(ROUTES)('renders %s in English with no untranslated keys leaking into the UI', async (route) => {
    await i18n.changeLanguage('en');
    const { container } = renderWithProviders(<App />, [route]);
    const text = container.textContent ?? '';
    const leaked = EN_PATHS.filter((path) => path.includes('.') && text.includes(path));
    expect(leaked).toEqual([]);
  });
});

describe('document direction and language switching', () => {
  it('sets dir="rtl" on the document for Hebrew', async () => {
    await i18n.changeLanguage('he');
    renderWithProviders(<App />, ['/']);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
  });

  it('sets dir="ltr" on the document for English', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(<App />, ['/']);
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switches language from the header and flips the document direction', async () => {
    await i18n.changeLanguage('he');
    renderWithProviders(<App />, ['/']);
    expect(document.documentElement.dir).toBe('rtl');

    fireEvent.click(screen.getByRole('button', { name: i18n.t('language.label') as string }));
    expect(i18n.language).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(screen.getByRole('heading', { level: 1, name: en.app.title })).toBeInTheDocument();
  });

  it('keeps math notation LTR inside an RTL page', async () => {
    await i18n.changeLanguage('he');
    const { container } = renderWithProviders(<App />, ['/grade/7/coordinate-system/find-the-point']);
    const mathNodes = container.querySelectorAll('.math-text');
    expect(mathNodes.length).toBeGreaterThan(0);
    for (const node of mathNodes) expect(node).toHaveAttribute('dir', 'ltr');
  });

  it('always renders the coordinate plane itself LTR', async () => {
    await i18n.changeLanguage('he');
    const { container } = renderWithProviders(<App />, ['/grade/7/coordinate-system/hit-the-target']);
    expect(container.querySelector('.coordinate-grid')).toHaveAttribute('dir', 'ltr');
  });
});
