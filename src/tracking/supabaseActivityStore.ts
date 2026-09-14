import { supabase } from '../lib/supabase';
import type { ActivityMistake, GameSession } from '../types/activity';

interface GameSessionRow {
  id: string;
  user_id: string;
  game_id: string;
  started_at: string;
  completed_at: string | null;
  questions_count: number;
  correct_count: number;
  mistakes: ActivityMistake[];
}

function fromRow(row: GameSessionRow): GameSession {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    questionsCount: row.questions_count,
    correctCount: row.correct_count,
    mistakes: row.mistakes,
  };
}

export async function startSupabaseSession(gameId: string, userId: string): Promise<GameSession | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ game_id: gameId, user_id: userId, started_at: new Date().toISOString() })
    .select()
    .single();
  if (error || !data) return null;
  return fromRow(data);
}

export async function completeSupabaseSession(
  sessionId: string,
  result: { questionsCount: number; correctCount: number; mistakes: ActivityMistake[] },
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('game_sessions')
    .update({
      completed_at: new Date().toISOString(),
      questions_count: result.questionsCount,
      correct_count: result.correctCount,
      mistakes: result.mistakes,
    })
    .eq('id', sessionId);
}

export async function getSupabaseActivityHistory(userId: string): Promise<GameSession[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('game_sessions')
    .select()
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });
  if (error || !data) return [];
  return (data as GameSessionRow[]).map(fromRow);
}
