import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadModule(url?: string, anonKey?: string) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', url ?? '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', anonKey ?? '');
  return import('../supabase');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Supabase client creation', () => {
  it('is null (guest mode) when the env vars are unset', async () => {
    const { supabase, isSupabaseConfigured } = await loadModule();
    expect(supabase).toBeNull();
    expect(isSupabaseConfigured).toBe(false);
  });

  it('falls back to guest mode instead of throwing when the URL is malformed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { supabase, isSupabaseConfigured } = await loadModule('my-project-ref', 'anon-key');
    expect(supabase).toBeNull();
    expect(isSupabaseConfigured).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('creates a client that persists the session across reloads when configured', async () => {
    const { supabase, isSupabaseConfigured } = await loadModule('https://example.supabase.co', 'anon-key');
    expect(supabase).not.toBeNull();
    expect(isSupabaseConfigured).toBe(true);
  });

  it('tolerates values with surrounding whitespace (a common env-var paste error)', async () => {
    const { supabase } = await loadModule('  https://example.supabase.co  ', '  anon-key  ');
    expect(supabase).not.toBeNull();
  });
});
