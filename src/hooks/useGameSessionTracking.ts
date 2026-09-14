import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { completeGameSession, startGameSession } from '../tracking/activityTracker';
import type { ActivityMistake } from '../types/activity';

interface TrackedRound {
  total: number;
  score: number;
  completed: boolean;
  mistakes: ActivityMistake[];
  roundKey: number;
}

/** Opens a session when a round starts and closes it when the round completes. Never throws into the caller. */
export function useGameSessionTracking(gameId: string, round: TrackedRound, enabled = true): void {
  const { user, isInitializing } = useAuth();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for the stored Supabase session to resolve, otherwise a signed-in
    // student's first round on a freshly loaded page would be written to the
    // guest (localStorage) store and then re-opened once auth settles.
    if (!enabled || isInitializing) return;
    let cancelled = false;
    startGameSession(gameId, user?.id ?? null)
      .then((id) => {
        if (!cancelled) sessionIdRef.current = id;
      })
      .catch(() => {
        sessionIdRef.current = null;
      });
    return () => {
      cancelled = true;
    };
    // A new session opens for every retry (roundKey) and on user identity change.
  }, [enabled, isInitializing, gameId, user?.id, round.roundKey]);

  useEffect(() => {
    if (!round.completed || !sessionIdRef.current) return;
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    completeGameSession(sessionId, {
      questionsCount: round.total,
      correctCount: round.score,
      mistakes: round.mistakes,
    }).catch(() => {
      // Tracking failures must never surface to the player.
    });
    // round.total/score/mistakes are only read at the instant completion flips true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.completed]);
}
