import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext, type AuthContextValue, type AuthResult } from './authContextValue';
import type { User } from '@supabase/supabase-js';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(Boolean(supabase));

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

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // A session event also means the initial check is settled.
      setIsInitializing(false);
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
      return { error: error?.message ?? null };
    } catch {
      setUser(null);
      return { error: 'unexpected' };
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      status: user ? 'authenticated' : 'guest',
      user,
      isInitializing,
      isConfigured: Boolean(supabase),
      signUp,
      signIn,
      signOut,
    }),
    [user, isInitializing, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
