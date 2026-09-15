import { getGamePresentation, type GamePresentation } from '../data/gameCatalog';
import type { GameSession } from '../types/activity';

/**
 * Pure, deterministic aggregation over the sessions the tracking layer already
 * returned. No network, no randomness, no persistence — everything here is a
 * plain function of the session list plus "now", so it is fully testable and
 * the numbers on screen can always be explained.
 *
 * Completion rule: a session counts only when `completedAt` is set. That is
 * exactly how both tracking stores define a real session (localActivityStore
 * filters on it, supabaseActivityStore queries `completed_at is not null`), so
 * this page never invents a looser or stricter definition of "played".
 */

export type TimeRange = 'week' | 'month' | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActivityEntry {
  session: GameSession;
  game: GamePresentation;
  /** Parsed completedAt; entries without a usable date are dropped before this point. */
  completedAt: Date;
}

export interface ActivityTotals {
  sessions: number;
  questions: number;
  correct: number;
  /** Distinct local calendar days on which at least one session was completed. */
  practiceDays: number;
}

export interface TopicSummary {
  topicId: string;
  gradeId: number;
  sessions: number;
  questions: number;
  correct: number;
  lastPlayedAt: Date;
  /** Icons of the games practised in this topic, most recent first, de-duplicated. */
  icons: string[];
  accent: string;
  /** Route to the topic page, for "play more". */
  path?: string;
  status: PracticeStatus;
}

export interface GradeSummary {
  gradeId: number;
  topics: TopicSummary[];
}

/**
 * Honest, rule-based encouragement — never a mastery claim. A handful of
 * sessions cannot prove a child has mastered a topic, so these labels only
 * describe *practice behaviour* (how much, how recently) plus a soft nudge
 * when accuracy suggests more practice would help.
 */
export type PracticeStatus =
  | 'firstTry'
  | 'gettingStarted'
  | 'lotsOfPractice'
  | 'goingGreat'
  | 'morePractice'
  | 'restingTopic';

/**
 * Deterministic status rules, evaluated top to bottom:
 *  1. restingTopic   — not played in the last 14 days (regardless of how much).
 *  2. firstTry       — exactly one session ever.
 *  3. morePractice   — correct rate below 60% over 5+ answered questions.
 *  4. goingGreat     — correct rate at or above 80% over 5+ answered questions.
 *  5. lotsOfPractice — 5 or more sessions.
 *  6. gettingStarted — anything else (2-4 sessions, or too few questions to judge).
 * Accuracy is only consulted once there are enough questions for it to mean
 * anything, and it never produces a negative label — only "a bit more practice".
 */
export function derivePracticeStatus(
  input: { sessions: number; questions: number; correct: number; lastPlayedAt: Date },
  now: Date,
): PracticeStatus {
  const daysSince = (now.getTime() - input.lastPlayedAt.getTime()) / DAY_MS;
  if (daysSince >= 14) return 'restingTopic';
  if (input.sessions === 1) return 'firstTry';
  if (input.questions >= 5) {
    const rate = input.correct / input.questions;
    if (rate < 0.6) return 'morePractice';
    if (rate >= 0.8) return 'goingGreat';
  }
  if (input.sessions >= 5) return 'lotsOfPractice';
  return 'gettingStarted';
}

/** Drops sessions the tracking layer never completed, plus any with an unparsable date. */
export function toEntries(sessions: GameSession[]): ActivityEntry[] {
  return sessions
    .filter((session) => Boolean(session.completedAt))
    .map((session) => ({
      session,
      game: getGamePresentation(session.gameId),
      completedAt: new Date(session.completedAt!),
    }))
    .filter((entry) => !Number.isNaN(entry.completedAt.getTime()))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
}

/** Client-side range filter over already-loaded sessions — no extra backend queries. */
export function filterByRange(entries: ActivityEntry[], range: TimeRange, now: Date): ActivityEntry[] {
  if (range === 'all') return entries;
  const days = range === 'week' ? 7 : 30;
  const cutoff = now.getTime() - days * DAY_MS;
  return entries.filter((entry) => entry.completedAt.getTime() >= cutoff);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function computeTotals(entries: ActivityEntry[]): ActivityTotals {
  const days = new Set<string>();
  let questions = 0;
  let correct = 0;
  for (const entry of entries) {
    questions += entry.session.questionsCount;
    correct += entry.session.correctCount;
    days.add(dayKey(entry.completedAt));
  }
  return { sessions: entries.length, questions, correct, practiceDays: days.size };
}

/** Groups activity by grade → topic. Sessions whose game is no longer in the registry are skipped. */
export function groupByTopic(entries: ActivityEntry[], now: Date, topicPaths: Map<string, string | undefined>): GradeSummary[] {
  const byTopic = new Map<string, TopicSummary>();

  for (const entry of entries) {
    const { topicId, gradeId } = entry.game;
    if (!topicId || gradeId === undefined) continue;
    const key = `${gradeId}:${topicId}`;
    const existing = byTopic.get(key);
    if (existing) {
      existing.sessions += 1;
      existing.questions += entry.session.questionsCount;
      existing.correct += entry.session.correctCount;
      if (entry.completedAt > existing.lastPlayedAt) existing.lastPlayedAt = entry.completedAt;
      if (!existing.icons.includes(entry.game.icon)) existing.icons.push(entry.game.icon);
    } else {
      byTopic.set(key, {
        topicId,
        gradeId,
        sessions: 1,
        questions: entry.session.questionsCount,
        correct: entry.session.correctCount,
        lastPlayedAt: entry.completedAt,
        icons: [entry.game.icon],
        accent: entry.game.accent,
        path: topicPaths.get(topicId),
        status: 'firstTry',
      });
    }
  }

  const summaries = [...byTopic.values()].map((summary) => ({
    ...summary,
    status: derivePracticeStatus(summary, now),
  }));

  const byGrade = new Map<number, TopicSummary[]>();
  for (const summary of summaries) {
    const list = byGrade.get(summary.gradeId) ?? [];
    list.push(summary);
    byGrade.set(summary.gradeId, list);
  }

  return [...byGrade.entries()]
    .map(([gradeId, topics]) => ({
      gradeId,
      topics: topics.sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime()),
    }))
    .sort((a, b) => a.gradeId - b.gradeId);
}

export type InsightKind = 'mostPracticed' | 'comeBack' | 'freshChallenge' | 'keepGoing';

export interface ActivityInsight {
  kind: InsightKind;
  /** i18n interpolation values (topic name is resolved by the component). */
  topicId: string;
  gradeId: number;
  /** Where the "let's go" action should lead, when we have a route. */
  path?: string;
  icon: string;
}

/**
 * Exactly one insight per render, chosen by fixed priority so the same data
 * always yields the same message (no randomness, no backend call):
 *  1. comeBack      — a topic already practised but untouched for 14+ days.
 *  2. freshChallenge— a topic with 6+ sessions and a strong (>=80%) correct rate.
 *  3. mostPracticed — the topic with the most sessions in the last 7 days.
 *  4. keepGoing     — fallback nudge toward the most recently played topic.
 * Wording is always encouraging; nothing here reports a deficit.
 */
export function pickInsight(grades: GradeSummary[], now: Date): ActivityInsight | null {
  const topics = grades.flatMap((grade) => grade.topics);
  if (topics.length === 0) return null;

  const toInsight = (kind: InsightKind, topic: TopicSummary): ActivityInsight => ({
    kind,
    topicId: topic.topicId,
    gradeId: topic.gradeId,
    path: topic.path,
    icon: topic.icons[0] ?? '✨',
  });

  const resting = topics
    .filter((topic) => (now.getTime() - topic.lastPlayedAt.getTime()) / DAY_MS >= 14)
    .sort((a, b) => a.lastPlayedAt.getTime() - b.lastPlayedAt.getTime())[0];
  if (resting) return toInsight('comeBack', resting);

  const strong = topics
    .filter((topic) => topic.sessions >= 6 && topic.questions >= 5 && topic.correct / topic.questions >= 0.8)
    .sort((a, b) => b.sessions - a.sessions)[0];
  if (strong) return toInsight('freshChallenge', strong);

  const weekCutoff = now.getTime() - 7 * DAY_MS;
  const thisWeek = topics
    .filter((topic) => topic.lastPlayedAt.getTime() >= weekCutoff)
    .sort((a, b) => b.sessions - a.sessions || b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime())[0];
  if (thisWeek) return toInsight('mostPracticed', thisWeek);

  const latest = [...topics].sort((a, b) => b.lastPlayedAt.getTime() - a.lastPlayedAt.getTime())[0];
  return toInsight('keepGoing', latest);
}
