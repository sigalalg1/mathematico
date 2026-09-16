import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function createSupabaseClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey, {
      auth: {
        // Keeps the student signed in across page reloads (localStorage), and
        // refreshes the token in the background.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    // A malformed VITE_SUPABASE_URL makes createClient throw synchronously.
    // That must never take the whole app down — fall back to guest mode.
    console.warn('[Mathletica] Supabase is misconfigured; running in guest mode.', error);
    return null;
  }
}

/**
 * `null` when Supabase isn't configured (missing env vars) or is misconfigured.
 * Every consumer must treat that as "fall back to guest/local behavior" rather
 * than throw.
 */
export const supabase: SupabaseClient | null = createSupabaseClient();

/** True when signed-in features (accounts, cross-device activity) are available. */
export const isSupabaseConfigured = supabase !== null;
