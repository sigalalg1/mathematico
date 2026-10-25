import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { SignRulesPage } from '../SignRulesPage';
import { getTrainingActivity } from '../../training/registry';

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

function advanceDiscovery() {
  fireEvent.click(screen.getByRole('button', { name: t('signRules.discovery.continue') }));
}

function reachTraining() {
  advanceDiscovery();
  advanceDiscovery();
  fireEvent.click(screen.getByRole('button', { name: t('signRules.discovery.startPractice') }));
}

describe('Multiplying & Dividing Signed Numbers — discovery progression', () => {
  it('begins with the positive-factor pattern and crosses zero', () => {
    renderWithProviders(<SignRulesPage />);
    expect(screen.getByText('3 × 4 = 12')).toBeInTheDocument();
    expect(screen.getByText('0 × 4 = 0')).toBeInTheDocument();
    expect(screen.getByText('(−3) × 4 = −12')).toBeInTheDocument();
    expect(screen.queryByText(t('signRules.discovery.rule'))).not.toBeInTheDocument();
  });

  it('derives negative times negative from a vertical continuation', () => {
    renderWithProviders(<SignRulesPage />);
    advanceDiscovery();
    expect(screen.getByText('3 × (−4) = −12')).toBeInTheDocument();
    expect(screen.getByText('0 × (−4) = 0')).toBeInTheDocument();
    expect(screen.getByText('(−2) × (−4) = 8')).toBeInTheDocument();
  });

  it('shows one summary rule only after both patterns, with all four examples', () => {
    renderWithProviders(<SignRulesPage />);
    advanceDiscovery();
    advanceDiscovery();
    expect(screen.getByText(t('signRules.discovery.rule'))).toBeInTheDocument();
    for (const example of ['3 × 4 = 12', '(−3) × (−4) = 12', '(−3) × 4 = −12', '3 × (−4) = −12']) {
      expect(screen.getByText(example)).toBeInTheDocument();
    }
  });

  it('does not show a timer on conceptual discovery screens', () => {
    renderWithProviders(<SignRulesPage />);
    expect(screen.queryByTestId('tr-timer')).not.toBeInTheDocument();
  });
});

describe('Multiplying & Dividing Signed Numbers — Training Mode integration', () => {
  it('registers the same stable activity id used by the Signed Numbers card', () => {
    expect(getTrainingActivity('signRules')).toBeDefined();
  });

  it('opens shared Practice and Personal Challenge setup after discovery', () => {
    renderWithProviders(<SignRulesPage />);
    reachTraining();
    expect(screen.getByText(t('training.modes.practice.name'))).toBeInTheDocument();
    expect(screen.getByText(t('training.modes.challenge.name'))).toBeInTheDocument();
    for (const count of [5, 10, 20, 50]) expect(screen.getByText(String(count))).toBeInTheDocument();
  });

  it('offers all three concept-based difficulty choices', () => {
    renderWithProviders(<SignRulesPage />);
    reachTraining();
    for (const level of ['basic', 'intermediate', 'hard']) {
      expect(screen.getByText(t(`training.difficulty.${level}`))).toBeInTheDocument();
      expect(screen.getByText(t(`signRules.difficulty.${level}`))).toBeInTheDocument();
    }
  });
});

describe('Multiplying & Dividing Signed Numbers — language and math direction', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('keeps parentheses, minus signs, multiplication, and division LTR in Hebrew', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<SignRulesPage />);
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    for (const math of container.querySelectorAll('.math-text')) expect(math).toHaveAttribute('dir', 'ltr');
    expect(screen.getByText('(−3) × 4 = −12')).toHaveAttribute('dir', 'ltr');
  });

  it('renders the requested English title without raw keys', async () => {
    await useLanguage('en');
    const { container } = renderWithProviders(<SignRulesPage />);
    expect(screen.getByText('Multiplying & Dividing Signed Numbers')).toBeInTheDocument();
    expect(container.textContent).not.toContain('signRules.');
  });

  it('renders the requested Hebrew title without raw keys', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<SignRulesPage />);
    expect(screen.getByText('כפל וחילוק מספרים מכוונים')).toBeInTheDocument();
    expect(container.textContent).not.toContain('signRules.');
  });
});
