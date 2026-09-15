import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';
import {
  coordinateSystemGames,
  divisionWithRemainderGames,
  fractionsPart1Games,
  multiplicationGames,
  signedNumbersGames,
  simpleFractionsGames,
} from '../data/games';
import type { GameSession } from '../types/activity';
import './ActivityPage.css';

function useGameName(gameId: string): string {
  const { t } = useTranslation();
  const game = [
    ...coordinateSystemGames,
    ...signedNumbersGames,
    ...divisionWithRemainderGames,
    ...simpleFractionsGames,
    ...fractionsPart1Games,
    ...multiplicationGames,
  ].find((entry) => entry.id === gameId);
  return game ? t(game.nameKey) : gameId;
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

export function ActivityPage() {
  const { t } = useTranslation();
  const { user, isInitializing } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    let cancelled = false;
    getActivityHistory(user?.id ?? null)
      .then((history) => {
        if (!cancelled) setSessions(history);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isInitializing]);

  return (
    <PageLayout title={t('activity.title')} backTo="/" backLabel={t('app.title')}>
      {loaded && sessions.length === 0 && <p className="activity-empty">{t('activity.empty')}</p>}
      {sessions.length > 0 && (
        <div className="activity-list">
          {sessions.map((session) => (
            <ActivityRow key={session.id} session={session} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
