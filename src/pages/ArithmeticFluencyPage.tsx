import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { ActivityTile, ActivityTileGrid, PracticeBanner, TitleSparkles } from '../components/ActivityTileGrid';
import { toneForIndex } from '../components/activityTones';
import { ActivityIcon } from '../components/ActivityIcons';
import { arithmeticFluencyGames } from '../data/games';
import { ARITHMETIC_FACTS_TO_20 } from '../data/games/arithmeticFluencyData';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';

/**
 * The grade 2 arithmetic-fluency unit: four foundational skills, listed with
 * the same large, colourful tiles the grade 3–4 units use. Deliberately not a
 * grade 2 curriculum — one focused area, practised until it is quick.
 */
export function ArithmeticFluencyPage() {
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

  const activities = arithmeticFluencyGames.filter(
    (game): game is typeof game & { path: string } => game.enabled && Boolean(game.path),
  );

  return (
    <PageLayout
      title={t('arithmeticFluencyPage.title')}
      titleAccent={
        <TitleSparkles>
          <ActivityIcon activityId={ARITHMETIC_FACTS_TO_20} />
        </TitleSparkles>
      }
      subtitle={t('arithmeticFluencyPage.listIntro')}
      context={t('grades.2')}
      backTo="/grade/2"
      backLabel={t('nav.grade2Topics')}
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
              completedGameIds.has(game.id) ? `✓ ${t('arithmeticFluencyPage.completedBadge')}` : undefined
            }
          />
        ))}
      </ActivityTileGrid>
      <PracticeBanner backTo="/grade/2" backLabel={t('nav.grade2Topics')} />
    </PageLayout>
  );
}
