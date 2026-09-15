import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { SignRulesPage } from '../SignRulesPage';
import type { SignRuleChallenge } from '../../types/signRules';

// The discovery question: the pattern walks down into (-2) × (-3) = 6.
const DISCOVERY: SignRuleChallenge = {
  id: 'q1',
  min: -12,
  max: 12,
  step: 1,
  operator: '×',
  left: -2,
  right: -3,
  result: 6,
  family: 'negNeg',
  showLadder: true,
  ladder: [
    { left: 1, right: -3, result: -3 },
    { left: 0, right: -3, result: 0 },
    { left: -1, right: -3, result: 3 },
  ],
};

// An applied question whose pattern is held back as a hint.
const APPLIED: SignRuleChallenge = {
  id: 'q2',
  min: -12,
  max: 12,
  step: 1,
  operator: '×',
  left: 3,
  right: -4,
  result: -12,
  family: 'posNeg',
  showLadder: false,
  ladder: [
    { left: 6, right: -4, result: -24 },
    { left: 5, right: -4, result: -20 },
    { left: 4, right: -4, result: -16 },
  ],
};

const DIVISION: SignRuleChallenge = {
  id: 'q3',
  min: -12,
  max: 12,
  step: 1,
  operator: ':',
  left: -12,
  right: 3,
  result: -4,
  family: 'negPos',
  showLadder: false,
  ladder: [],
};

vi.mock('../../data/games/signRulesData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/games/signRulesData')>();
  return {
    ...actual,
    SIGN_RULES_TOTAL: 3,
    buildSignRulesChallenges: () => [DISCOVERY, APPLIED, DIVISION],
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const tick = (value: number) => screen.getByRole('button', { name: String(value) });
const ladderRows = (container: HTMLElement) => [...container.querySelectorAll('.signed-ladder-row')].map((n) => n.textContent);
const discoveredRules = (container: HTMLElement) =>
  [...container.querySelectorAll('.signed-rule-chip.is-discovered')].map((n) => n.textContent);

function solve(value: number) {
  fireEvent.click(tick(value));
  act(() => vi.advanceTimersByTime(1600));
}

describe('The Sign Rule — discovering the rule from a pattern', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the descending pattern that leads into the question', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    expect(screen.getByText(t('signRules.ladderTitle'))).toBeInTheDocument();
    expect(ladderRows(container)).toEqual(['1 × (-3) = -3', '0 × (-3) = 0', '(-1) × (-3) = 3']);
    expect(screen.getByText('(-2) × (-3) = ?')).toBeInTheDocument();
  });

  it('asks the student to continue the pattern rather than recite a rule', () => {
    renderWithProviders(<SignRulesPage />);
    expect(screen.getByText(t('signRules.prompt.continuePattern'))).toBeInTheDocument();
  });

  it('starts with every sign rule still undiscovered', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    expect(container.querySelectorAll('.signed-rule-chip')).toHaveLength(4);
    expect(discoveredRules(container)).toEqual([]);
  });

  it('lights the rule the student has just proved, and only that one', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    fireEvent.click(tick(6));
    expect(discoveredRules(container)).toEqual([t('signRules.rules.negNeg')]);
    act(() => vi.advanceTimersByTime(1600));
    expect(progress()).toBe('2');
  });

  it('measures the result from zero once it is right', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    fireEvent.click(tick(6));
    expect(container.querySelector('.number-line-span-correct .number-line-span-label')?.textContent).toBe('6');
    expect(screen.getByText('(-2) × (-3) = 6')).toBeInTheDocument();
  });
});

describe('The Sign Rule — wrong answers teach', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('separates a sign mistake from an arithmetic one', () => {
    renderWithProviders(<SignRulesPage />);
    fireEvent.click(tick(-6));
    expect(progress()).toBe('1');
    expect(screen.getByText(t('signRules.feedback.signError'))).toBeInTheDocument();

    fireEvent.click(tick(5));
    expect(screen.getByText(t('signRules.feedback.magnitudeError'))).toBeInTheDocument();
  });

  it('does not light a rule the student got wrong', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    fireEvent.click(tick(-6));
    expect(discoveredRules(container)).toEqual([]);
  });

  it('reveals the pattern as a hint on an applied question once the student slips', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    solve(6);
    expect(ladderRows(container)).toEqual([]);

    fireEvent.click(tick(12));
    expect(ladderRows(container)).toEqual(['6 × (-4) = -24', '5 × (-4) = -20', '4 × (-4) = -16']);
    expect(screen.getByText(t('signRules.feedback.ladderHint'))).toBeInTheDocument();
  });

  it('never reveals the result while the answer is still wrong', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    fireEvent.click(tick(-6));
    expect(container.querySelectorAll('.number-line-point.is-correct')).toHaveLength(0);
    expect(container.querySelectorAll('.number-line-point.is-incorrect')).toHaveLength(1);
  });

  it('allows a retry in place and only locks once correct', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    fireEvent.click(tick(-6));
    expect(container.querySelectorAll('.number-line-point.is-disabled')).toHaveLength(0);

    fireEvent.click(tick(6));
    expect(container.querySelectorAll('.number-line-point:not(.is-disabled)')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(1600));
    expect(progress()).toBe('2');
  });
});

describe('The Sign Rule — division and completion', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('applies the same rule to division, with no pattern to lean on', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    solve(6);
    solve(-12);

    expect(screen.getByText('(-12) : 3 = ?')).toBeInTheDocument();
    fireEvent.click(tick(4));
    expect(screen.getByText(t('signRules.feedback.signError'))).toBeInTheDocument();
    expect(ladderRows(container)).toEqual([]);
  });

  it('accumulates the discovered rules across the session and finishes', () => {
    const { container } = renderWithProviders(<SignRulesPage />);
    solve(6);
    solve(-12);
    fireEvent.click(tick(-4));
    expect(discoveredRules(container)).toEqual([
      t('signRules.rules.posNeg'),
      t('signRules.rules.negPos'),
      t('signRules.rules.negNeg'),
    ]);
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.getByText(t('signRules.completion.title'))).toBeInTheDocument();
  });
});

describe('The Sign Rule — languages', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('keeps every expression LTR inside the Hebrew page', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<SignRulesPage />);
    const mathNodes = container.querySelectorAll('.math-text');
    expect(mathNodes.length).toBeGreaterThan(0);
    for (const node of mathNodes) expect(node).toHaveAttribute('dir', 'ltr');
    for (const chip of container.querySelectorAll('.signed-rule-chip')) expect(chip).toHaveAttribute('dir', 'ltr');
    expect(container.querySelector('.number-line')).toHaveAttribute('dir', 'ltr');
  });

  it('renders in English with no raw translation keys', async () => {
    await useLanguage('en');
    const { container } = renderWithProviders(<SignRulesPage />);
    expect(container.textContent).not.toContain('signRules.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('The Sign Rule')).toBeInTheDocument();
  });

  it('renders in Hebrew with no raw translation keys', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<SignRulesPage />);
    expect(container.textContent).not.toContain('signRules.');
    expect(container.textContent).not.toContain('signedNumbers.');
    expect(screen.getByText('חוק הסימנים')).toBeInTheDocument();
  });
});
