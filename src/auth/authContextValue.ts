import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthStatus = 'guest' | 'authenticated';

export interface AuthResult {
  /**
   * `null` on success. `'unavailable'` / `'unexpected'` are sentinel codes the
   * UI translates; anything else is a message from Supabase shown as-is.
   */
  error: string | null;
  /** Sign-up only: the project requires the student to confirm their email first. */
  needsEmailConfirmation?: boolean;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True only while the initial session check is in flight; never gates the UI. */
  isInitializing: boolean;
  /** False when Supabase isn't configured — the app stays fully playable as a guest. */
  isConfigured: boolean;
  /** True once the student has followed a password-reset email link and can now set a new password. */
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  /** Emails the student a password-reset link. */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Sets a new password; only meaningful while `isPasswordRecovery` is true. */
  updatePassword: (newPassword: string) => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
