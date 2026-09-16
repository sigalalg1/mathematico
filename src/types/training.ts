/**
 * Shared vocabulary for the training system.
 *
 * Nothing here is multiplication-specific: an activity declares what it
 * supports (question counts, difficulties, personal challenge) and how to
 * generate questions, and the generic engine in `src/training/` owns session
 * lifecycle, timing, streak, metrics, records and the results UI.
 */

/** Low-pressure practice, or a measured attempt at beating your own record. */
export type TrainingMode = 'practice' | 'challenge';

/**
 * One difficulty an activity offers. `id` is stored in records, so it must stay
 * stable; the meaning of a level is defined by the activity itself, never by a
 * global numeric band.
 */
export interface TrainingDifficultyOption {
  id: string;
  /** i18n key for the child-facing label (בסיסי / בינוני / קשה …). */
  labelKey: string;
  /** i18n key for the one-line explanation of what this level actually covers. */
  descriptionKey: string;
}

/**
 * What an activity opts into. Absent/empty values mean "this activity does not
 * offer that control" — nothing is forced on every activity in the app.
 */
export interface TrainingCapabilities {
  /** Question counts offered in practice mode. */
  questionCounts: number[];
  defaultQuestionCount: number;
  /** Empty when the activity has a single, undifferentiated question pool. */
  difficulties: TrainingDifficultyOption[];
  defaultDifficultyId: string | null;
  /** False when personal challenge makes no sense for this activity. */
  supportsChallenge: boolean;
  /**
   * Counts eligible for a personal challenge — deliberately a subset, so very
   * short, noisy sessions never become records.
   */
  challengeQuestionCounts: number[];
  /**
   * Minimum accuracy (0–1) a session must reach before its pace may set a
   * speed record. Per activity, not a platform-wide rule: multiplication
   * fluency uses 1 (a flawless run), a future activity may relax it.
   */
  paceRecordMinAccuracy: number;
  /**
   * Bumped whenever the question-generation rules materially change, so old
   * records never silently compete against a different set of questions.
   * Never shown in the UI.
   */
  rulesVersion: number;
}

/**
 * The exact conditions a result was produced under. Two results are only
 * comparable when all four fields match.
 */
export interface TrainingConfiguration {
  activityId: string;
  /** `null` for activities without difficulty levels. */
  difficultyId: string | null;
  questionCount: number;
  rulesVersion: number;
}

/** One question as the generic engine sees it. */
export interface TrainingQuestion {
  /** Unique within the session. */
  id: string;
  /** The fact itself, e.g. `7 × 8` — rendered LTR through MathText. */
  prompt: string;
  /** Canonical correct answer, compared as a string. */
  answer: string;
  /** Answer choices in display order; contains exactly one `answer`. */
  options: string[];
}

/** Everything activity-specific the training system needs. */
export interface TrainingActivityDefinition {
  /** Matches the `Game.id` in the activity registry. */
  id: string;
  capabilities: TrainingCapabilities;
  /** i18n key prefix for this activity's own copy (title, prompt, …). */
  i18nPrefix: string;
  /**
   * Builds one session. Must return exactly `count` questions; repeats are
   * allowed when a difficulty's fact pool is smaller than the requested count.
   */
  generateQuestions: (input: { difficultyId: string | null; count: number }) => TrainingQuestion[];
}

/** One answered question, with the time the child actually spent on it. */
export interface TrainingAnswerRecord {
  questionId: string;
  prompt: string;
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
  /**
   * Active time from the question becoming interactive to the answer being
   * submitted. Excludes app-controlled feedback/animation pauses, and any span
   * the session was paused or the tab was hidden.
   */
  elapsedMs: number;
}

/** The immutable outcome of one completed session. */
export interface TrainingSessionResult {
  id: string;
  configuration: TrainingConfiguration;
  mode: TrainingMode;
  startedAt: string;
  completedAt: string;
  /**
   * Active start → finish, including the short feedback beats but excluding
   * every span the session was paused or the tab was hidden. Shown as the
   * session's total time; context only, never a record.
   */
  totalDurationMs: number;
  /**
   * Sum of the per-question active think times — the fair measure of pace.
   * Feedback beats, paused time and hidden time are all outside it.
   */
  answeringDurationMs: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  /** 0–1, kept unrounded; rounding happens at display time only. */
  accuracy: number;
  longestStreak: number;
  /** `answeringDurationMs / totalQuestions`, in milliseconds. */
  averageMsPerQuestion: number;
}

/** Best-ever figures for one fixed configuration, derived from stored results. */
export interface TrainingPersonalBest {
  configurationKey: string;
  configuration: TrainingConfiguration;
  attempts: number;
  bestAccuracy: number;
  bestLongestStreak: number;
  /** `null` until a session has met the activity's pace-eligibility rule. */
  bestAverageMsPerQuestion: number | null;
  lastCompletedAt: string;
}

/** How one result compares with what came before it, per dimension. */
export interface TrainingDimensionComparison {
  value: number;
  /** Best before this session; `null` when this is the first attempt. */
  previousBest: number | null;
  isRecord: boolean;
  /** Signed size of the gain over the previous best, `null` when there is none. */
  improvement: number | null;
}

export interface TrainingImprovement {
  /** No earlier result exists for this configuration — this one is the baseline. */
  isFirstAttempt: boolean;
  accuracy: TrainingDimensionComparison;
  streak: TrainingDimensionComparison;
  pace: TrainingDimensionComparison & {
    /** False when accuracy was below the activity's pace-record threshold. */
    isEligible: boolean;
  };
}
