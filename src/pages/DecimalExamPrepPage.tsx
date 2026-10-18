import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { decimalPlaceValueGames } from '../data/games';
import { useAuth } from '../auth/useAuth';
import { getActivityHistory } from '../tracking/activityTracker';

const UNIT_PATH = '/grade/4/decimal-place-value';

/**
 * The unit's own landing page: a diagnostic and a mock exam up top (the two
 * whole-unit entry points), then one row per skill for targeted practice on
 * its own — a student never has to repeat the full diagnostic just to drill
 * one skill.
 */
export function DecimalExamPrepPage() {
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <PageLayout
      title={t('decimalExamPrepPage.title')}
      subtitle={t('decimalExamPrepPage.subtitle')}
      context={t('grades.4')}
      backTo="/grade/4"
      backLabel={t('nav.grade4Topics')}
    >
      <div className="row-list">
        <Card
          layout="row"
          accent="purple"
          title={t('decimalDiagnostic.intro.title')}
          description={t('decimalDiagnostic.intro.description')}
          icon="🎯"
          to={`${UNIT_PATH}/diagnostic`}
        />
        <Card
          layout="row"
          accent="purple"
          title={t('decimalMockExam.intro.title')}
          description={t('decimalMockExam.intro.description')}
          icon="📝"
          to={`${UNIT_PATH}/mock-exam`}
        />
      </div>
      <div className="row-list">
        {decimalPlaceValueGames.map((game) => (
          <Card
            layout="row"
            key={game.id}
            title={t(game.nameKey)}
            description={t(game.descriptionKey)}
            icon={game.icon}
            to={game.enabled ? game.path : undefined}
            disabled={!game.enabled}
            statusBadge={game.enabled && completedGameIds.has(game.id) ? `✓ ${t('decimalExamPrepPage.completedBadge')}` : undefined}
          />
        ))}
      </div>
    </PageLayout>
  );
}
