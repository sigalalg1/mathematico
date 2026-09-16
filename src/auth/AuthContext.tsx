import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext, type AuthContextValue, type AuthResult } from './authContextValue';
import type { User } from '@supabase/supabase-js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(supabase));
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setUser(data.session?.user ?? null);
      })
      .catch(() => {
        // Unreachable/misconfigured backend — stay a guest instead of crashing.
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsInitializing(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // A session event also means the initial check is settled.
      setIsInitializing(false);
      // Fired when the student follows the emailed reset link — the session is
      // valid but only for setting a new password, not general sign-in.
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'unavailable' };
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      // Supabase returns a session immediately only when email confirmation is off.
      return { error: null, needsEmailConfirmation: data.session === null };
    } catch {
      return { error: 'unexpected' };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'unavailable' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch {
      return { error: 'unexpected' };
    }
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: null };
    try {
      const { error } = await supabase.auth.signOut();
      // Even when the server rejects (expired/unknown session) the student must
      // end up signed out locally rather than stuck in a half-signed-in state.
      setUser(null);
      setIsPasswordRecovery(false);
      return { error: error?.message ?? null };
    } catch {
      setUser(null);
      setIsPasswordRecovery(false);
      return { error: 'unexpected' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'unavailable' };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    } catch {
      return { error: 'unexpected' };
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return { error: 'unavailable' };
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: error.message };
      // The dedicated reset-password page tracks its own "done" state, so it's
      // safe to leave recovery mode now rather than sticking for the rest of
      // the browser session.
      setIsPasswordRecovery(false);
      return { error: null };
    } catch {
      return { error: 'unexpected' };
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      status: user ? 'authenticated' : 'guest',
      user,
      isInitializing,
      isConfigured: Boolean(supabase),
      isPasswordRecovery,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [user, isInitializing, isPasswordRecovery, signUp, signIn, signOut, resetPassword, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
