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

  // Every activity in these units ships enabled with a route; the guard keeps
  // a future placeholder entry from rendering a dead link.
  const activities = geometryAnglesTrianglesGames.filter(
    (game): game is typeof game & { path: string } => game.enabled && Boolean(game.path),
  );

  return (
    <PageLayout
      title={t('geometry.unitName')}
      titleAccent={
        <TitleSparkles>
          <ActivityIcon activityId="meet-the-triangle" />
        </TitleSparkles>
      }
      subtitle={t('geometry.listIntro')}
      context={t('grades.3')}
      backTo="/grade/3"
      backLabel={t('nav.grade3Topics')}
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
            completedLabel={completed.has(game.id) ? `✓ ${t('geometry.completedBadge')}` : undefined}
          />
        ))}
      </ActivityTileGrid>
      <PracticeBanner backTo="/grade/3" backLabel={t('nav.grade3Topics')} />
    </PageLayout>
  );
}
