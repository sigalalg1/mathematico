import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../../App';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/testUtils';

describe('Matika brand navigation', () => {
  it('renders the approved full logo as the home-page heading', () => {
    renderWithProviders(<App />, ['/']);

    const homeLink = screen.getByRole('link', { name: i18n.t('app.homeLabel') });
    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink.querySelector('.brand-logo')).toHaveAttribute('src', '/brand/matika-logo.png');
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(i18n.t('app.title'));
  });

  it('uses the compact mark in the responsive home control and navigates home', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, ['/grade/4']);

    const homeLink = screen.getByRole('link', { name: i18n.t('app.homeLabel') });
    expect(homeLink.querySelector('.brand-mark')).toHaveAttribute('src', '/brand/matika-mark.png');

    await user.click(homeLink);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(i18n.t('app.title'));
  });
});
