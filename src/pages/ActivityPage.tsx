import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { useAuth } from '../auth/useAuth';
import { loadActivityHistory } from '../tracking/activityTracker';
import { topics } from '../data/topics';
import type { GameSession } from '../types/activity';
import {
  computeTotals,
  filterByRange,
  groupByTopic,
  pickInsight,
  toEntries,
  type ActivityEntry,
  type TimeRange,
} from '../utils/activitySummary';
import './ActivityPage.css';

type LoadState = 'loading' | 'ready' | 'failed';

const RANGES: TimeRange[] = ['week', 'month', 'all'];

/** Topic id → topic route, so "play more" reuses the registry instead of a parallel map. */
const topicPaths = new Map(topics.map((topic) => [topic.id, topic.path]));

function useDateLabel() {
  const { t, i18n } = useTranslation();
  return (date: Date, now: Date): string => {
    const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
    const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));
    if (daysAgo <= 0) return t('activity.recent.today');
    if (daysAgo === 1) return t('activity.recent.yesterday');
    return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  };
}

function SummaryTile({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="activity-tile">
      <span className="activity-tile-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="activity-tile-value">{value}</span>
      <span className="activity-tile-label">{label}</span>
    </div>
  );
}

function ActivityCard({ entry, now }: { entry: ActivityEntry; now: Date }) {
  const { t } = useTranslation();
  const dateLabel = useDateLabel();
  const gameName = t(entry.game.nameKey);
  const meta = t('activity.recent.gradeTopic', {
    grade: entry.game.gradeId ? t(`grades.${entry.game.gradeId}`) : '',
    topic: entry.game.topicId ? t(`topics.${entry.game.topicId}.name`) : '',
  });
  const score = t('activity.recent.score', {
    correct: entry.session.correctCount,
    total: entry.session.questionsCount,
  });

  const body = (
    <>
      <span className={`activity-card-icon accent-${entry.game.accent}`} aria-hidden="true">
        {entry.game.icon}
      </span>
      <span className="activity-card-body">
        <span className="activity-card-title">{gameName}</span>
        {(entry.game.gradeId || entry.game.topicId) && <span className="activity-card-meta">{meta}</span>}
        <span className="activity-card-score">{score}</span>
      </span>
      <span className="activity-card-date">{dateLabel(entry.completedAt, now)}</span>
    </>
  );

  if (!entry.game.path) {
    return <li className="activity-card is-static">{body}</li>;
  }

  return (
    <li>
      <Link className="activity-card" to={entry.game.path} aria-label={t('activity.recent.playAgain', { game: gameName })}>
        {body}
      </Link>
    </li>
  );
}

export function ActivityPage() {
  const { t } = useTranslation();
  const { user, isInitializing } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [range, setRange] = useState<TimeRange>('all');
  // Frozen at load time so relative dates, range filters and practice rules all
  // agree with each other and don't shift between renders.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (isInitializing) return;
    let cancelled = false;
    // State starts as 'loading' and is only ever set from the async callback —
    // setting it synchronously here would cause a cascading render.
    loadActivityHistory(user?.id ?? null).then((result) => {
      if (cancelled) return;
      setNow(new Date());
      setSessions(result.sessions);
      setState(result.failed ? 'failed' : 'ready');
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isInitializing]);

  const allEntries = useMemo(() => toEntries(sessions), [sessions]);
  const entries = useMemo(() => filterByRange(allEntries, range, now), [allEntries, range, now]);
  const totals = useMemo(() => computeTotals(entries), [entries]);
  const grades = useMemo(() => groupByTopic(entries, now, topicPaths), [entries, now]);
  const insight = useMemo(() => pickInsight(grades, now), [grades, now]);

  const isGuest = !user;

  if (isInitializing || state === 'loading') {
    return (
      <PageLayout title={t('activity.title')} subtitle={t('activity.subtitle')} backTo="/" backLabel={t('app.title')}>
        <div className="activity-loading" role="status" aria-live="polite">
          <p className="activity-sr-only">{t('activity.loading')}</p>
          <div className="activity-skeleton-row" aria-hidden="true">
            <span className="activity-skeleton-tile" />
            <span className="activity-skeleton-tile" />
            <span className="activity-skeleton-tile" />
            <span className="activity-skeleton-tile" />
          </div>
          <div className="activity-skeleton-list" aria-hidden="true">
            <span className="activity-skeleton-card" />
            <span className="activity-skeleton-card" />
            <span className="activity-skeleton-card" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (state === 'failed') {
    return (
      <PageLayout title={t('activity.title')} subtitle={t('activity.subtitle')} backTo="/" backLabel={t('app.title')}>
        <div className="activity-message">
          <p className="activity-message-title">{t('activity.errorTitle')}</p>
          <p className="activity-message-hint">{t('activity.errorHint')}</p>
          <Link className="btn btn-primary" to="/">
            {t('activity.errorAction')}
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (allEntries.length === 0) {
    return (
      <PageLayout title={t('activity.title')} subtitle={t('activity.subtitle')} backTo="/" backLabel={t('app.title')}>
        <div className="activity-message">
          <p className="activity-message-title">{t('activity.empty')}</p>
          <p className="activity-message-hint">{t('activity.emptyHint')}</p>
          <Link className="btn btn-primary" to="/">
            {t('activity.emptyAction')}
          </Link>
        </div>
        {isGuest && <p className="activity-guest-note">{t('activity.guestNote')}</p>}
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('activity.title')} subtitle={t('activity.subtitle')} backTo="/" backLabel={t('app.title')}>
      <div className="activity-page">
        <section className="activity-section" aria-labelledby="activity-summary-heading">
          <h2 className="activity-heading" id="activity-summary-heading">
            {t('activity.summary.heading')}
            <span className="activity-sparkles" aria-hidden="true">
              <span>⭐</span>
              <span>✨</span>
              <span>⭐</span>
            </span>
          </h2>
          <div className="activity-tiles">
            <SummaryTile icon="🎮" value={totals.sessions} label={t('activity.summary.games')} />
            <SummaryTile icon="✏️" value={totals.questions} label={t('activity.summary.questions')} />
            <SummaryTile icon="⭐" value={totals.correct} label={t('activity.summary.correct')} />
            <SummaryTile icon="📅" value={totals.practiceDays} label={t('activity.summary.days')} />
          </div>
          {totals.questions > 0 && (
            <p className="activity-accuracy">
              {t('activity.summary.accuracy', { correct: totals.correct, total: totals.questions })}
            </p>
          )}

          <div className="activity-range" role="group" aria-label={t('activity.range.label')}>
            {RANGES.map((option) => (
              <button
                key={option}
                type="button"
                className={`activity-range-btn${range === option ? ' is-active' : ''}`}
                aria-pressed={range === option}
                onClick={() => setRange(option)}
              >
                {t(`activity.range.${option}`)}
              </button>
            ))}
          </div>
        </section>

        {insight && (
          <section className="activity-insight" aria-labelledby="activity-insight-heading">
            <h2 className="activity-sr-only" id="activity-insight-heading">
              {t('activity.insight.heading')}
            </h2>
            <span className="activity-insight-icon" aria-hidden="true">
              {insight.icon}
            </span>
            <p className="activity-insight-text">
              {t(`activity.insight.${insight.kind}`, { topic: t(`topics.${insight.topicId}.name`) })}
            </p>
            {insight.path && (
              <Link className="btn btn-secondary activity-insight-action" to={insight.path}>
                {t('activity.insight.action')}
              </Link>
            )}
          </section>
        )}

        {entries.length === 0 && <p className="activity-range-empty">{t('activity.range.empty')}</p>}

        {entries.length > 0 && (
          <section className="activity-section" aria-labelledby="activity-recent-heading">
            <h2 className="activity-heading" id="activity-recent-heading">
              {t('activity.recent.heading')}
            </h2>
            <ul className="activity-list">
              {entries.map((entry) => (
                <ActivityCard key={entry.session.id} entry={entry} now={now} />
              ))}
            </ul>
          </section>
        )}

        {grades.length > 0 && (
          <section className="activity-section" aria-labelledby="activity-practiced-heading">
            <h2 className="activity-heading" id="activity-practiced-heading">
              {t('activity.practiced.heading')}
            </h2>
            {grades.map((grade) => (
              <div className="activity-grade" key={grade.gradeId}>
                <h3 className="activity-grade-title">{t(`grades.${grade.gradeId}`)}</h3>
                <div className="activity-topics">
                  {grade.topics.map((topic) => {
                    const card = (
                      <>
                        <span className="activity-topic-icons" aria-hidden="true">
                          {topic.icons.slice(0, 3).join(' ')}
                        </span>
                        <span className="activity-topic-name">{t(`topics.${topic.topicId}.name`)}</span>
                        <span className="activity-topic-counts">
                          {t('activity.practiced.sessions', { n: topic.sessions })} ·{' '}
                          {t('activity.practiced.questions', { n: topic.questions })}
                        </span>
                        <span className={`activity-status activity-status-${topic.status}`}>
                          {t(`activity.status.${topic.status}`)}
                        </span>
                      </>
                    );
                    return topic.path ? (
                      <Link
                        key={`${topic.gradeId}-${topic.topicId}`}
                        className={`activity-topic-card accent-${topic.accent}`}
                        to={topic.path}
                        aria-label={t('activity.practiced.playMore', { topic: t(`topics.${topic.topicId}.name`) })}
                      >
                        {card}
                      </Link>
                    ) : (
                      <div key={`${topic.gradeId}-${topic.topicId}`} className={`activity-topic-card accent-${topic.accent}`}>
                        {card}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {isGuest && <p className="activity-guest-note">{t('activity.guestNote')}</p>}
      </div>
    </PageLayout>
  );
}
