import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

async function loadBanner(appEnv?: string) {
  vi.resetModules();
  if (appEnv === undefined) {
    vi.stubEnv('VITE_APP_ENV', '');
  } else {
    vi.stubEnv('VITE_APP_ENV', appEnv);
  }
  const { DevEnvironmentBanner } = await import('../DevEnvironmentBanner');
  return DevEnvironmentBanner;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('DevEnvironmentBanner', () => {
  it('renders nothing when VITE_APP_ENV is unset', async () => {
    const DevEnvironmentBanner = await loadBanner();
    render(<DevEnvironmentBanner />);
    expect(screen.queryByText(/DEV/)).not.toBeInTheDocument();
  });

  it('renders nothing in production', async () => {
    const DevEnvironmentBanner = await loadBanner('production');
    render(<DevEnvironmentBanner />);
    expect(screen.queryByText(/DEV/)).not.toBeInTheDocument();
  });

  it('shows the DEV banner when VITE_APP_ENV=development', async () => {
    const DevEnvironmentBanner = await loadBanner('development');
    render(<DevEnvironmentBanner />);
    expect(screen.getByText('DEV • Mathletica')).toBeInTheDocument();
  });
});
