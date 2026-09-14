import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthStatus = 'guest' | 'authenticated';

export interface AuthResult {
  error: string | null;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True only while the initial session check is in flight; never gates the UI. */
  isInitializing: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
