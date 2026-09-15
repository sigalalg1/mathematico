import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { PageLayout } from '../components/PageLayout';
import { geometryAnglesTrianglesGames } from '../data/games';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';

export function GeometryAnglesTrianglesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getActivityHistory(user?.id ?? null)
      .then((sessions) => {
        if (!cancelled) setCompleted(new Set(sessions.map((session) => session.gameId)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <PageLayout title={t('geometry.unitName')} subtitle={t('geometry.unitDescription')} backTo="/grade/3" backLabel={t('nav.grade3Topics')}>
      <div className="card-grid">
        {geometryAnglesTrianglesGames.map((game, index) => (
          <Card
            key={game.id}
            title={`${index + 1}. ${t(game.nameKey)}`}
            description={t(game.descriptionKey)}
            icon={game.icon}
            to={game.path}
            statusBadge={completed.has(game.id) ? `✓ ${t('geometry.completedBadge')}` : undefined}
          />
        ))}
      </div>
    </PageLayout>
  );
}
