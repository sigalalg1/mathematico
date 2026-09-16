import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import {
  ActivityTile,
  ActivityTileGrid,
  PracticeBanner,
  TitleSparkles,
} from '../components/ActivityTileGrid';
import { toneForIndex } from '../components/activityTones';
import { ActivityIcon } from '../components/ActivityIcons';
import { multiplicationGames } from '../data/games';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';

export function MultiplicationPage() {
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

  // Every activity in these units ships enabled with a route; the guard keeps
  // a future placeholder entry from rendering a dead link.
  const activities = multiplicationGames.filter(
    (game): game is typeof game & { path: string } => game.enabled && Boolean(game.path),
  );

  return (
    <PageLayout
      title={t('multiplicationPage.title')}
      titleAccent={
        <TitleSparkles>
          <ActivityIcon activityId="multiplicationTables" />
        </TitleSparkles>
      }
      subtitle={t('multiplicationPage.listIntro')}
      context={t('grades.4')}
      backTo="/grade/4"
      backLabel={t('nav.grade4Topics')}
    >
      <ActivityTileGrid>
        {activities.map((game, index) => (
          <ActivityTile
            key={game.id}
            activityId={game.id}
            index={index + 1}
            tone={toneForIndex(index)}
            title={t(game.nameKey)}
            description={t(game.descriptionKey)}
            to={game.path}
            completedLabel={
              completedGameIds.has(game.id) ? `✓ ${t('multiplicationPage.completedBadge')}` : undefined
            }
          />
        ))}
      </ActivityTileGrid>
      <PracticeBanner backTo="/grade/4" backLabel={t('nav.grade4Topics')} />
    </PageLayout>
  );
}
