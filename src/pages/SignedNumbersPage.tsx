import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { signedNumbersGames } from '../data/games';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';

export function SignedNumbersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [completedGameIds, setCompletedGameIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getActivityHistory(user?.id ?? null)
      .then((sessions) => {
        if (cancelled) return;
        setCompletedGameIds(new Set(sessions.map((session) => session.gameId)));
      })
      .catch(() => {
        // Status badges are a nice-to-have; never let this block the page.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <PageLayout
      title={t('signedNumbersPage.title')}
      subtitle={t('signedNumbersPage.subtitle')}
      backTo="/grade/7"
      backLabel={t('nav.grade7Topics')}
    >
      <div className="card-grid">
        {signedNumbersGames.map((game) => (
          <Card
            key={game.id}
            title={t(game.nameKey)}
            description={t(game.descriptionKey)}
            icon={game.icon}
            to={game.enabled ? game.path : undefined}
            disabled={!game.enabled}
            statusBadge={game.enabled && completedGameIds.has(game.id) ? `✓ ${t('signedNumbersPage.completedBadge')}` : undefined}
          />
        ))}
      </div>
    </PageLayout>
  );
}
