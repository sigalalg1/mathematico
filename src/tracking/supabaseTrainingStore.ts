import { supabase } from '../lib/supabase';
import type { TrainingMode, TrainingSessionResult } from '../types/training';

/**
 * Signed-in persistence for training results, against the `training_sessions`
 * table (see `supabase/migrations/0001_training_sessions.sql`). Results belong
 * to the student, not the device, so they follow the account across browsers.
 *
 * Every read is scoped to one fixed configuration key; personal bests are
 * derived from the rows in TypeScript by the same code guests use, so both
 * backends can never disagree.
 */

interface TrainingSessionRow {
  id: string;
  user_id: string;
  activity_id: string;
  difficulty_id: string | null;
  question_count: number;
  rules_version: number;
  configuration_key: string;
  mode: string;
  started_at: string;
  completed_at: string;
  total_duration_ms: number;
  answering_duration_ms: number;
  total_questions: number;
  correct_count: number;
  longest_streak: number;
}

function toRow(result: TrainingSessionResult, userId: string, configurationKey: string): TrainingSessionRow {
  return {
    id: result.id,
    user_id: userId,
    activity_id: result.configuration.activityId,
    difficulty_id: result.configuration.difficultyId,
    question_count: result.configuration.questionCount,
    rules_version: result.configuration.rulesVersion,
    configuration_key: configurationKey,
    mode: result.mode,
    started_at: result.startedAt,
    completed_at: result.completedAt,
    total_duration_ms: Math.round(result.totalDurationMs),
    answering_duration_ms: Math.round(result.answeringDurationMs),
    total_questions: result.totalQuestions,
    correct_count: result.correctCount,
    longest_streak: result.longestStreak,
  };
}

/**
 * Accuracy and pace are recomputed here rather than stored, so a row can never
 * carry figures that disagree with its own counts.
 */
function fromRow(row: TrainingSessionRow): TrainingSessionResult {
  const totalQuestions = row.total_questions;
  return {
    id: row.id,
    configuration: {
      activityId: row.activity_id,
      difficultyId: row.difficulty_id,
      questionCount: row.question_count,
      rulesVersion: row.rules_version,
    },
    mode: row.mode === 'challenge' ? 'challenge' : ('practice' as TrainingMode),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    totalDurationMs: row.total_duration_ms,
    answeringDurationMs: row.answering_duration_ms,
    totalQuestions,
    correctCount: row.correct_count,
    incorrectCount: totalQuestions - row.correct_count,
    accuracy: totalQuestions === 0 ? 0 : row.correct_count / totalQuestions,
    longestStreak: row.longest_streak,
    averageMsPerQuestion: totalQuestions === 0 ? 0 : row.answering_duration_ms / totalQuestions,
  };
}

/** Resolves `false` when the row could not be written, so the caller can fall back. */
export async function saveSupabaseTrainingResult(
  result: TrainingSessionResult,
  userId: string,
  configurationKey: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('training_sessions').insert(toRow(result, userId, configurationKey));
  return !error;
}

/** How far back records are derived from — far more than a child will ever play. */
const HISTORY_LIMIT = 200;

export async function getSupabaseTrainingResults(
  userId: string,
  configurationKey: string,
): Promise<TrainingSessionResult[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('training_sessions')
    .select()
    .eq('user_id', userId)
    .eq('configuration_key', configurationKey)
    .order('completed_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error || !data) return null;
  return (data as TrainingSessionRow[]).map(fromRow);
}
