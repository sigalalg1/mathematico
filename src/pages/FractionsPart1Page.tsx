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
import { FractionPieGlyph } from '../components/ActivityIcons';
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

  // Every activity in these units ships enabled with a route; the guard keeps
  // a future placeholder entry from rendering a dead link.
  const activities = fractionsPart1Games.filter(
    (game): game is typeof game & { path: string } => game.enabled && Boolean(game.path),
  );

  return (
    <PageLayout
      title={t('fractionsPart1.unitName')}
      titleAccent={
        <TitleSparkles>
          <FractionPieGlyph />
        </TitleSparkles>
      }
      subtitle={t('fractionsPart1.listIntro')}
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
              completedGameIds.has(game.id) ? `✓ ${t('simpleFractionsPage.completedBadge')}` : undefined
            }
          />
        ))}
      </ActivityTileGrid>
      <PracticeBanner backTo="/grade/4" backLabel={t('nav.grade4Topics')} />
    </PageLayout>
  );
}
