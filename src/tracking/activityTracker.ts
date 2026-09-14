import type { ActivityMistake, GameSession } from '../types/activity';
import { completeLocalSession, getLocalActivityHistory, startLocalSession } from './localActivityStore';
import { completeSupabaseSession, getSupabaseActivityHistory, startSupabaseSession } from './supabaseActivityStore';

type Backend = 'local' | 'supabase';

/** Remembers which backend a session was opened in, so completing it targets the same store. */
const sessionBackends = new Map<string, Backend>();

/**
 * Reusable activity-tracking API used by every game. Callers never talk to
 * Supabase or localStorage directly — this module decides where a session
 * lives based on whether a user is signed in, and swallows any backend
 * failure so tracking can never interrupt gameplay.
 */
export async function startGameSession(gameId: string, userId: string | null): Promise<string> {
  if (userId) {
    try {
      const session = await startSupabaseSession(gameId, userId);
      if (session) {
        sessionBackends.set(session.id, 'supabase');
        return session.id;
      }
    } catch {
      // Fall through to local tracking below.
    }
  }

  const session = startLocalSession(gameId);
  sessionBackends.set(session.id, 'local');
  return session.id;
}

export async function completeGameSession(
  sessionId: string,
  result: { questionsCount: number; correctCount: number; mistakes: ActivityMistake[] },
): Promise<void> {
  const backend = sessionBackends.get(sessionId) ?? 'local';
  try {
    if (backend === 'supabase') {
      await completeSupabaseSession(sessionId, result);
    } else {
      completeLocalSession(sessionId, result);
    }
  } catch {
    // Tracking failures must never surface to the player.
  } finally {
    sessionBackends.delete(sessionId);
  }
}

export async function getActivityHistory(userId: string | null): Promise<GameSession[]> {
  if (userId) {
    try {
      return await getSupabaseActivityHistory(userId);
    } catch {
      return [];
    }
  }
  return getLocalActivityHistory();
}
