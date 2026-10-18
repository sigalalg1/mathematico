import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { toneForIndex } from '../components/activityTones';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';
import { getAllTrainingResults } from '../tracking/trainingTracker';
import { findGame } from '../data/games';
import { getTrainingActivity } from '../training/registry';
import { buildTrainingRecords, summarizeTrainingResults, type TrainingRecordCard, type TrainingSummary } from '../training/records';
import { accuracyPercent, secondsPerQuestion } from '../training/metrics';
import type { GameSession } from '../types/activity';
import type { TrainingSessionResult } from '../types/training';
import './ActivityPage.css';

/** Enough to read at a glance without scrolling; "show more" reveals the rest. */
const RECENT_VISIBLE = 4;
const RECENT_EXPANDED = 20;

function useGameName(gameId: string): string {
  const { t } = useTranslation();
  const game = findGame(gameId);
  return game ? t(game.nameKey) : gameId;
}

export function ActivityPage() {
  const { t } = useTranslation();
  const { user, isInitializing } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [trainingResults, setTrainingResults] = useState<TrainingSessionResult[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    let cancelled = false;
    const userId = user?.id ?? null;
    Promise.all([getActivityHistory(userId), getAllTrainingResults(userId)])
      .then(([history, results]) => {
        if (cancelled) return;
        setSessions(history);
        setTrainingResults(results);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isInitializing]);

  // Personal-challenge results (see `TrainingActivityScreen`, only challenge
  // mode ever reaches this store) are aggregated into one card per distinct
  // configuration — that aggregation is the whole point of this redesign.
  const summary = useMemo(() => summarizeTrainingResults(trainingResults), [trainingResults]);
  const records = useMemo(() => buildTrainingRecords(trainingResults), [trainingResults]);

  const hasAnyActivity = sessions.length > 0 || trainingResults.length > 0;

  return (
    <PageLayout title={t('activity.title')} backTo="/" backLabel={t('app.title')}>
      {loaded && !hasAnyActivity && <p className="activity-empty">{t('activity.empty')}</p>}

      {loaded && hasAnyActivity && (
        <div className="activity-page">
          <ActivitySummary summary={summary} />
          <RecordsSection records={records} />
          <RecentSection
            sessions={sessions}
            expanded={showAllRecent}
            onToggle={() => setShowAllRecent((value) => !value)}
          />
        </div>
      )}
    </PageLayout>
  );
}

function ActivitySummary({ summary }: { summary: TrainingSummary }) {
  const { t } = useTranslation();
  const stats: { key: string; value: string; label: string }[] = [];

  // Every metric here can be genuinely absent — no fabricated 0% or 0.0s
  // while there is nothing behind it yet.
  if (summary.averageAccuracy !== null) {
    stats.push({
      key: 'accuracy',
      value: `${accuracyPercent(summary.averageAccuracy)}%`,
      label: t('activity.summary.accuracyLabel'),
    });
  }
  if (summary.averagePaceMs !== null) {
    stats.push({
      key: 'pace',
      value: t('activity.summary.paceValue', { seconds: secondsPerQuestion(summary.averagePaceMs) }),
      label: t('activity.summary.paceLabel'),
    });
  }
  if (summary.challengeCount > 0) {
    stats.push({ key: 'count', value: String(summary.challengeCount), label: t('activity.summary.challengesLabel') });
  }

  if (stats.length === 0) return null;

  return (
    <div className="activity-summary" data-testid="activity-summary">
      {stats.map((stat) => (
        <div className="activity-summary-stat" key={stat.key}>
          <MathText className="activity-summary-value">{stat.value}</MathText>
          <span className="activity-summary-label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

function RecordsSection({ records }: { records: TrainingRecordCard[] }) {
  const { t } = useTranslation();

  return (
    <section className="activity-records" aria-labelledby="activity-records-title">
      <h2 className="activity-section-title" id="activity-records-title">
        {t('activity.records.title')}
      </h2>

      {records.length === 0 ? (
        <div className="activity-records-empty">
          <p className="activity-records-empty-title">{t('activity.records.emptyTitle')}</p>
          <p className="activity-records-empty-body">{t('activity.records.emptyBody')}</p>
          <Link className="btn btn-secondary" to="/">
            {t('activity.records.emptyAction')}
          </Link>
        </div>
      ) : (
        <div className="activity-records-grid">
          {records.map((card, index) => (
            <RecordCard key={`${card.configuration.activityId}|${card.configuration.difficultyId ?? '-'}|${card.configuration.questionCount}`} card={card} tone={toneForIndex(index)} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecordCard({ card, tone }: { card: TrainingRecordCard; tone: string }) {
  const { t } = useTranslation();
  const activity = getTrainingActivity(card.configuration.activityId);
  const activityName = activity ? t(`${activity.i18nPrefix}.gameName`) : card.configuration.activityId;
  const difficultyOption = activity?.capabilities.difficulties.find((option) => option.id === card.configuration.difficultyId);
  const configLabel = difficultyOption
    ? t('activity.records.configLabel', { difficulty: t(difficultyOption.labelKey), count: card.configuration.questionCount })
    : t('activity.records.configLabelNoDifficulty', { count: card.configuration.questionCount });

  const { bestAverageMsPerQuestion, bestAccuracy } = card.personalBest;
  const correctCount = Math.round(bestAccuracy * card.configuration.questionCount);

  const content = (
    <>
      <div className="record-card-head">
        <span className="record-card-activity">{activityName}</span>
        <span className="record-card-config">{configLabel}</span>
      </div>
      {bestAverageMsPerQuestion !== null ? (
        <p className="record-card-pace">
          <MathText>{String(secondsPerQuestion(bestAverageMsPerQuestion))}</MathText>{' '}
          <span className="record-card-pace-unit">{t('training.results.paceUnit')}</span>
        </p>
      ) : (
        <p className="record-card-fraction">
          {t('activity.records.correctFraction', { correct: correctCount, total: card.configuration.questionCount })}
        </p>
      )}
      {bestAverageMsPerQuestion !== null && (
        <p className="record-card-fraction record-card-fraction-secondary">
          {t('activity.records.correctFraction', { correct: correctCount, total: card.configuration.questionCount })}
        </p>
      )}
      {card.isRelaunchable && card.launchPath && (
        <span className="record-card-cta">
          {t('activity.records.cta')}
          <span className="btn-arrow" aria-hidden="true">
            →
          </span>
        </span>
      )}
    </>
  );

  const className = `record-card record-card-${tone}${card.isRelaunchable ? ' record-card-live' : ''}`;

  return card.isRelaunchable && card.launchPath ? (
    <Link className={className} to={card.launchPath}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function RecentSection({
  sessions,
  expanded,
  onToggle,
}: {
  sessions: GameSession[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const visible = sessions.slice(0, expanded ? RECENT_EXPANDED : RECENT_VISIBLE);

  return (
    <section className="activity-recent" aria-labelledby="activity-recent-title">
      <h2 className="activity-section-title" id="activity-recent-title">
        {t('activity.recent.title')}
      </h2>

      {visible.length === 0 ? (
        <p className="activity-empty">{t('activity.recent.empty')}</p>
      ) : (
        <div className="activity-list">
          {visible.map((session) => (
            <ActivityRow key={session.id} session={session} />
          ))}
        </div>
      )}

      {sessions.length > RECENT_VISIBLE && (
        <button type="button" className="activity-recent-toggle" onClick={onToggle}>
          {t(expanded ? 'activity.recent.showLess' : 'activity.recent.showMore')}
        </button>
      )}
    </section>
  );
}

function ActivityRow({ session }: { session: GameSession }) {
  const { i18n } = useTranslation();
  const gameName = useGameName(session.gameId);
  const date = session.completedAt ? new Date(session.completedAt) : null;

  return (
    <div className="activity-row">
      <div className="activity-row-main">
        <span className="activity-row-game">{gameName}</span>
        {date && (
          <span className="activity-row-date" dir="ltr">
            {date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
      <span className="activity-row-score" dir="ltr">
        {session.correctCount} / {session.questionsCount}
      </span>
    </div>
  );
}
