import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { Session, User } from '@supabase/supabase-js';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';

// A mutable stand-in for the real client so each test can pick "not configured",
// "configured and signed out", "configured and signed in", or "backend broken".
type FakeAuth = {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
};

const holder: { client: { auth: FakeAuth } | null } = { client: null };

vi.mock('../../lib/supabase', () => ({
  get supabase() {
    return holder.client;
  },
  get isSupabaseConfigured() {
    return holder.client !== null;
  },
}));

const user = { id: 'user-1', email: 'kid@example.com' } as User;
const session = { user } as Session;

let authStateCallback: ((event: string, session: Session | null) => void) | null = null;

function configureSupabase(overrides: Partial<FakeAuth> = {}): FakeAuth {
  const auth: FakeAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signUp: vi.fn().mockResolvedValue({ data: { session, user }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session, user }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    ...overrides,
  };
  holder.client = { auth };
  return auth;
}

const t = (key: string) => i18n.t(key) as string;

/** The submit button and the mode tab share a label, so target them by role in the form. */
function submitButton(): HTMLButtonElement {
  const button = document.querySelector('.account-form button[type="submit"]');
  if (!button) throw new Error('the account form has no submit button');
  return button as HTMLButtonElement;
}

function modeTab(name: string): HTMLButtonElement {
  const tab = [...document.querySelectorAll<HTMLButtonElement>('.account-tab')].find(
    (button) => button.textContent === name,
  );
  if (!tab) throw new Error(`no account tab named ${name}`);
  return tab;
}

async function renderAccountPage() {
  const { AccountPage } = await import('../../pages/AccountPage');
  const result = renderWithProviders(<AccountPage />, ['/account']);
  // Let the initial getSession() promise settle before assertions.
  await act(async () => {});
  return result;
}

async function renderResetPasswordPage() {
  const { ResetPasswordPage } = await import('../../pages/ResetPasswordPage');
  const result = renderWithProviders(<ResetPasswordPage />, ['/reset-password']);
  await act(async () => {});
  return result;
}

function submitCredentials(password = '0000') {
  fireEvent.change(screen.getByLabelText(t('auth.email')), { target: { value: 'kid@example.com' } });
  fireEvent.change(screen.getByLabelText(t('auth.password')), { target: { value: password } });
  fireEvent.click(submitButton());
}

beforeEach(() => {
  holder.client = null;
  authStateCallback = null;
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scenario 1 & 9 — the app never depends on Supabase being available', () => {
  it('renders the account page in guest mode when Supabase is not configured', async () => {
    await renderAccountPage();
    expect(screen.getByText(t('auth.unavailable'))).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText(t('auth.guestNote'))).toBeInTheDocument();
  });

  it('stays usable when the initial session lookup rejects (unreachable backend)', async () => {
    configureSupabase({ getSession: vi.fn().mockRejectedValue(new Error('network down')) });
    await renderAccountPage();
    expect(screen.getByRole('heading', { level: 1, name: t('auth.title') })).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it('shows a readable message instead of crashing when sign-in throws', async () => {
    configureSupabase({ signInWithPassword: vi.fn().mockRejectedValue(new Error('boom')) });
    await renderAccountPage();
    submitCredentials();
    expect(await screen.findByText(t('auth.unexpectedError'))).toBeInTheDocument();
  });

  it('shows the Supabase error message when credentials are rejected', async () => {
    configureSupabase({
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } }),
    });
    await renderAccountPage();
    submitCredentials();
    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
  });
});

describe('scenarios 3-5 — sign up, sign in, sign out', () => {
  it('signs up and reports that the account is ready when no confirmation is required', async () => {
    const auth = configureSupabase();
    await renderAccountPage();
    fireEvent.click(modeTab(t('auth.signUp')));
    fireEvent.change(screen.getByLabelText(t('auth.email')), { target: { value: 'kid@example.com' } });
    fireEvent.change(screen.getByLabelText(t('auth.password')), { target: { value: '0000' } });
    fireEvent.click(submitButton());

    expect(await screen.findByText(t('auth.signUpSuccess'))).toBeInTheDocument();
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'kid@example.com', password: '0000' });
  });

  it('asks the student to confirm their email when Supabase returns no session', async () => {
    configureSupabase({ signUp: vi.fn().mockResolvedValue({ data: { session: null, user }, error: null }) });
    await renderAccountPage();
    fireEvent.click(modeTab(t('auth.signUp')));
    fireEvent.change(screen.getByLabelText(t('auth.email')), { target: { value: 'kid@example.com' } });
    fireEvent.change(screen.getByLabelText(t('auth.password')), { target: { value: '0000' } });
    fireEvent.click(submitButton());

    expect(await screen.findByText(t('auth.signUpConfirmEmail'))).toBeInTheDocument();
  });

  it('accepts a simple 4-character password with no client-side complexity rules', async () => {
    const auth = configureSupabase();
    await renderAccountPage();
    const password = screen.getByLabelText(t('auth.password')) as HTMLInputElement;
    fireEvent.change(screen.getByLabelText(t('auth.email')), { target: { value: 'kid@example.com' } });
    fireEvent.change(password, { target: { value: '0000' } });

    expect(password).not.toHaveAttribute('minlength');
    expect(password).not.toHaveAttribute('pattern');
    expect(password.checkValidity()).toBe(true);

    fireEvent.click(submitButton());
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'kid@example.com', password: '0000' }));
  });

  it('signs in and then shows the signed-in panel', async () => {
    configureSupabase();
    await renderAccountPage();
    submitCredentials();
    await act(async () => authStateCallback?.('SIGNED_IN', session));
    expect(await screen.findByText('kid@example.com')).toBeInTheDocument();
  });

  it('signs out and returns to the sign-in form', async () => {
    const auth = configureSupabase({ getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }) });
    await renderAccountPage();
    expect(screen.getByText('kid@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('auth.signOut') }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
    expect(await screen.findByLabelText(t('auth.email'))).toBeInTheDocument();
  });

  it('still signs the student out locally when the server rejects the sign-out', async () => {
    configureSupabase({
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: { message: 'Session not found' } }),
    });
    await renderAccountPage();
    fireEvent.click(screen.getByRole('button', { name: t('auth.signOut') }));
    expect(await screen.findByLabelText(t('auth.email'))).toBeInTheDocument();
  });

  it('does not leave an unhandled rejection when sign-out throws', async () => {
    configureSupabase({
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      signOut: vi.fn().mockRejectedValue(new Error('offline')),
    });
    await renderAccountPage();
    fireEvent.click(screen.getByRole('button', { name: t('auth.signOut') }));
    expect(await screen.findByText(t('auth.unexpectedError'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('auth.email'))).toBeInTheDocument();
  });
});

describe('forgot password — request a reset link', () => {
  it('sends a reset link and shows confirmation, without touching sign-in state', async () => {
    const auth = configureSupabase();
    await renderAccountPage();
    fireEvent.click(screen.getByRole('button', { name: t('auth.forgotPasswordLink') }));
    fireEvent.change(screen.getByLabelText(t('auth.email')), { target: { value: 'kid@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: t('auth.resetPasswordAction') }));

    expect(await screen.findByText(t('auth.resetPasswordSent'))).toBeInTheDocument();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('kid@example.com', expect.objectContaining({ redirectTo: expect.any(String) }));
  });

  it('can return to the sign-in form from the forgot-password screen', async () => {
    configureSupabase();
    await renderAccountPage();
    fireEvent.click(screen.getByRole('button', { name: t('auth.forgotPasswordLink') }));
    expect(screen.getByText(t('auth.forgotPasswordTitle'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: t('auth.backToSignIn') }));
    expect(screen.getByLabelText(t('auth.password'))).toBeInTheDocument();
  });

  it('shows a readable message instead of crashing when the request throws', async () => {
    configureSupabase({ resetPasswordForEmail: vi.fn().mockRejectedValue(new Error('offline')) });
    await renderAccountPage();
    fireEvent.click(screen.getByRole('button', { name: t('auth.forgotPasswordLink') }));
    fireEvent.change(screen.getByLabelText(t('auth.email')), { target: { value: 'kid@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: t('auth.resetPasswordAction') }));
    expect(await screen.findByText(t('auth.unexpectedError'))).toBeInTheDocument();
  });

  it('is disabled when Supabase is not configured', async () => {
    await renderAccountPage();
    fireEvent.click(screen.getByRole('button', { name: t('auth.forgotPasswordLink') }));
    expect(screen.getByRole('button', { name: t('auth.resetPasswordAction') })).toBeDisabled();
  });
});

describe('reset-password page — set a new password after following the emailed link', () => {
  it('shows the new-password form once a PASSWORD_RECOVERY event fires, and saves the new password', async () => {
    const auth = configureSupabase();
    await renderResetPasswordPage();
    await act(async () => authStateCallback?.('PASSWORD_RECOVERY', session));

    fireEvent.change(await screen.findByLabelText(t('auth.newPassword')), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: t('auth.setNewPasswordAction') }));

    expect(await screen.findByText(t('auth.setNewPasswordSuccess'))).toBeInTheDocument();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: '1234' });
  });

  it('shows a readable message instead of crashing when updating the password fails', async () => {
    configureSupabase({ updateUser: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Session expired' } }) });
    await renderResetPasswordPage();
    await act(async () => authStateCallback?.('PASSWORD_RECOVERY', session));
    fireEvent.change(await screen.findByLabelText(t('auth.newPassword')), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: t('auth.setNewPasswordAction') }));
    expect(await screen.findByText('Session expired')).toBeInTheDocument();
  });

  it('shows an "invalid link" message rather than a form when visited without a recovery session', async () => {
    configureSupabase();
    await renderResetPasswordPage();
    expect(await screen.findByText(t('auth.resetLinkInvalid'))).toBeInTheDocument();
    expect(screen.queryByLabelText(t('auth.newPassword'))).not.toBeInTheDocument();
  });
});

describe('regression — recovery mode never overrides the normal Account page', () => {
  it('never shows the set-new-password form on /account, even during a recovery session', async () => {
    configureSupabase();
    await renderAccountPage();
    await act(async () => authStateCallback?.('PASSWORD_RECOVERY', session));
    expect(screen.queryByText(t('auth.setNewPasswordTitle'))).not.toBeInTheDocument();
    expect(screen.queryByLabelText(t('auth.newPassword'))).not.toBeInTheDocument();
  });

  it('shows the ordinary sign-in form on /account for a guest with no session at all', async () => {
    configureSupabase();
    await renderAccountPage();
    expect(screen.getByLabelText(t('auth.email'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('auth.password'))).toBeInTheDocument();
  });
});

describe('scenario 10 — a stored session survives a reload', () => {
  it('restores the signed-in student from the persisted Supabase session', async () => {
    configureSupabase({ getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }) });
    await renderAccountPage();
    expect(screen.getByText('kid@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('auth.signOut') })).toBeInTheDocument();
  });
});
