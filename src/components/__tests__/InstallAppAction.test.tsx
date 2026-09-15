import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/testUtils';
import { InstallAppAction } from '../InstallAppAction';

function mockDisplayMode(standalone: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: standalone,
    media: '(display-mode: standalone)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function mockNavigatorProperty(property: 'userAgent' | 'platform' | 'maxTouchPoints', value: string | number) {
  Object.defineProperty(navigator, property, { configurable: true, value });
}

describe('install app action', () => {
  beforeEach(() => {
    localStorage.clear();
    mockDisplayMode(false);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'userAgent');
    Reflect.deleteProperty(navigator, 'platform');
    Reflect.deleteProperty(navigator, 'maxTouchPoints');
    await i18n.changeLanguage('he');
  });

  it('uses the translated native install action and hides after acceptance', async () => {
    await i18n.changeLanguage('en');
    const prompt = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<InstallAppAction />);

    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });
    fireEvent(window, event);

    const action = await screen.findByRole('button', { name: 'Install Matika' });
    await userEvent.click(action);
    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() => expect(action).not.toBeInTheDocument());
  });

  it('offers opt-in iOS Safari guidance and remembers dismissal', async () => {
    mockNavigatorProperty('userAgent', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1');
    mockNavigatorProperty('platform', 'iPhone');
    mockNavigatorProperty('maxTouchPoints', 5);
    renderWithProviders(<InstallAppAction />);

    await userEvent.click(screen.getByRole('button', { name: i18n.t('install.iosAction') }));
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('install.iosInstructions'));
    await userEvent.click(screen.getByRole('button', { name: i18n.t('install.dismiss') }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(localStorage.getItem('matika-install-dismissed')).toBe('true');
  });

  it('suppresses install UI in standalone mode', () => {
    mockDisplayMode(true);
    mockNavigatorProperty('userAgent', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile Safari/604.1');
    mockNavigatorProperty('platform', 'iPhone');
    renderWithProviders(<InstallAppAction />);

    expect(screen.queryByRole('button', { name: i18n.t('install.iosAction') })).not.toBeInTheDocument();
  });
});
