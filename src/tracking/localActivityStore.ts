import type { ActivityMistake, GameSession } from '../types/activity';

const STORAGE_KEY = 'mathematico-guest-activity';

function readAll(): GameSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Abandoned (never completed) rounds accumulate forever otherwise, eventually filling storage. */
const MAX_STORED_SESSIONS = 200;

function writeAll(sessions: GameSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_STORED_SESSIONS)));
  } catch {
    // Storage unavailable or full — silently drop; tracking must never break gameplay.
  }
}

/** crypto.randomUUID is unavailable in insecure contexts (plain-http dev hosts). */
function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Fall through to the non-crypto id below.
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function startLocalSession(gameId: string): GameSession {
  const session: GameSession = {
    id: newSessionId(),
    userId: null,
    gameId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    questionsCount: 0,
    correctCount: 0,
    mistakes: [],
  };
  writeAll([session, ...readAll()]);
  return session;
}

export function completeLocalSession(
  sessionId: string,
  result: { questionsCount: number; correctCount: number; mistakes: ActivityMistake[] },
): void {
  const sessions = readAll();
  const index = sessions.findIndex((session) => session.id === sessionId);
  if (index === -1) return;
  sessions[index] = {
    ...sessions[index],
    completedAt: new Date().toISOString(),
    questionsCount: result.questionsCount,
    correctCount: result.correctCount,
    mistakes: result.mistakes,
  };
  writeAll(sessions);
}

export function getLocalActivityHistory(): GameSession[] {
  return readAll()
    .filter((session) => session.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
}
