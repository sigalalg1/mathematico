import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { TrainingGlyphs } from '../components/TrainingGlyphs';
import { grades } from '../data/grades';
import { findGame } from '../data/games';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';
import type { GameSession } from '../types/activity';
import './HomePage.css';

/**
 * The most recent *completed* session that still maps to a live activity.
 * Nothing here is invented: if the learner has no history, the whole
 * "continue training" block is simply omitted.
 */
function useLastSession(): GameSession | null {
  const { user, isInitializing } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null);

  useEffect(() => {
    if (isInitializing) return;
    let cancelled = false;
    getActivityHistory(user?.id ?? null)
      .then((history) => {
        if (cancelled) return;
        setSession(history.find((entry) => findGame(entry.gameId)?.path) ?? null);
      })
      .catch(() => {
        // The home screen must render even if history is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isInitializing]);

  return session;
}

export function HomePage() {
  const { t } = useTranslation();
  const lastSession = useLastSession();
  const lastGame = lastSession ? findGame(lastSession.gameId) : undefined;
  const enabledGrades = grades.filter((grade) => grade.enabled);
  const startPath = lastGame?.path ?? (enabledGrades[0] ? `/grade/${enabledGrades[0].id}` : '/');

  return (
    <PageLayout title={t('app.title')} brandTitle>
      <div className="home">
        <p className="eyebrow home-phrase">{t('app.brandPhrase')}</p>
        <TrainingGlyphs />

        <Link className="btn btn-primary btn-cta" to={startPath}>
          {lastGame ? t('app.continueTraining') : t('app.startTraining')}
          <span className="btn-arrow" aria-hidden="true">
            →
          </span>
        </Link>

        {lastSession && lastGame?.path && (
          <section className="section" aria-labelledby="home-continue">
            <h2 className="section-label" id="home-continue">
              {t('app.continueTraining')}
            </h2>
            <div className="row-list">
              <Card
                layout="row"
                title={t(lastGame.nameKey)}
                description={t('app.lastResult', {
                  correct: lastSession.correctCount,
                  total: lastSession.questionsCount,
                })}
                icon={lastGame.icon}
                to={lastGame.path}
              />
            </div>
          </section>
        )}

        <section className="section" aria-labelledby="home-grades">
          <h2 className="section-label" id="home-grades">
            {t('app.chooseGrade')}
          </h2>
          <div className="card-grid">
            {grades.map((grade, index) => (
              <Card
                key={grade.id}
                title={t(`grades.${grade.id}`)}
                icon={<span dir="ltr">{grade.id}</span>}
                accent={index % 2 === 0 ? 'mint' : 'purple'}
                to={grade.enabled ? `/grade/${grade.id}` : undefined}
                disabled={!grade.enabled}
              />
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
