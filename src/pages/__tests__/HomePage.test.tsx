import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import { HomePage } from '../HomePage';
import App from '../../App';
import { grades } from '../../data/grades';

describe('HomePage grade selection', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('shows only grades that actually have content, and hides the rest', () => {
    renderWithProviders(<HomePage />);
    const gradeLinks = screen.getAllByRole('link').filter((link) => /^\/grade\/\d+$/.test(link.getAttribute('href') ?? ''));
    const enabledIds = grades.filter((g) => g.enabled).map((g) => g.id);
    const disabledIds = grades.filter((g) => !g.enabled).map((g) => g.id);

    expect(enabledIds.length).toBeGreaterThan(0);
    expect(disabledIds.length).toBeGreaterThan(0);
    // Exactly one card per grade with real content — no disabled placeholders.
    expect(gradeLinks).toHaveLength(enabledIds.length);
    for (const id of enabledIds) {
      expect(gradeLinks.some((link) => link.getAttribute('href') === `/grade/${id}`)).toBe(true);
    }
    for (const id of disabledIds) {
      expect(gradeLinks.some((link) => link.getAttribute('href') === `/grade/${id}`)).toBe(false);
    }
  });

  it('never shows a grade as a bare number', () => {
    renderWithProviders(<HomePage />);
    for (const id of grades.filter((g) => g.enabled).map((g) => g.id)) {
      // The numeric id must not appear as its own standalone text node anywhere on the card.
      expect(screen.queryByText(String(id), { selector: 'span' })).not.toBeInTheDocument();
    }
  });

  it('shows Grade 4 as "כיתה ד\'" and Grade 7 as "כיתה ז\'" in Hebrew', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("כיתה ד'")).toBeInTheDocument();
    expect(screen.getByText("כיתה ז'")).toBeInTheDocument();
  });

  it('shows "Grade 4" and "Grade 7" in English', async () => {
    await useLanguage('en');
    renderWithProviders(<HomePage />);
    expect(screen.getByText('Grade 4')).toBeInTheDocument();
    expect(screen.getByText('Grade 7')).toBeInTheDocument();
  });

  it('navigates to the grade page when a visible grade card is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, ['/']);
    await user.click(screen.getByRole('link', { name: /כיתה ד/ }));
    expect(await screen.findByRole('heading', { level: 1, name: "כיתה ד'" })).toBeInTheDocument();
  });
});
