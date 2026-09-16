import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from '../../App';
import i18n from '../../i18n';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

describe('Mathletica brand navigation', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('renders the Hebrew lockup as the home-page heading', () => {
    renderWithProviders(<App />, ['/']);

    const homeLink = screen.getByRole('link', { name: i18n.t('app.homeLabel') });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink.querySelector('.brand-mark')).toBeInTheDocument();
    expect(homeLink).toHaveTextContent('מתלטיקה');
    expect(homeLink).toHaveTextContent(i18n.t('app.tagline'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(i18n.t('app.title'));
  });

  it('renders the English lockup when the interface is English', async () => {
    await useLanguage('en');
    renderWithProviders(<App />, ['/']);

    const homeLink = screen.getByRole('link', { name: i18n.t('app.homeLabel') });
    expect(homeLink).toHaveTextContent('Mathletica');
    expect(homeLink).toHaveTextContent('Math made lighter.');
  });

  it('keeps a compact home control on inner pages and navigates home', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, ['/grade/4']);

    const homeLink = screen.getByRole('link', { name: i18n.t('app.homeLabel') });
    expect(homeLink.querySelector('.brand-mark')).toBeInTheDocument();

    await user.click(homeLink);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(i18n.t('app.title'));
  });

  it('no longer references the retired brand anywhere in the shell', () => {
    const { container } = renderWithProviders(<App />, ['/']);
    expect(container.innerHTML).not.toMatch(/matika/i);
  });
});
