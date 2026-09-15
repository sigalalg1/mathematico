import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { fractionsPart1Games } from '../data/games';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';

export function FractionsPart1Page() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [completedGameIds, setCompletedGameIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getActivityHistory(user?.id ?? null)
      .then((sessions) => {
        if (!cancelled) setCompletedGameIds(new Set(sessions.map((session) => session.gameId)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <PageLayout
      title={t('fractionsPart1.unitName')}
      subtitle={t('fractionsPart1.unitDescription')}
      backTo="/grade/4"
      backLabel={t('nav.grade4Topics')}
    >
      <div className="card-grid">
        {fractionsPart1Games.map((game, index) => (
          <Card
            key={game.id}
            title={`${index + 1}. ${t(game.nameKey)}`}
            description={t(game.descriptionKey)}
            icon={game.icon}
            to={game.path}
            statusBadge={completedGameIds.has(game.id) ? `✓ ${t('simpleFractionsPage.completedBadge')}` : undefined}
          />
        ))}
      </div>
    </PageLayout>
  );
}
