import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { GridGlyph } from '../components/icons';
import { grades } from '../data/grades';
import { getTopicsForGrade } from '../data/topics';

/**
 * Each topic is represented by its own mathematical notation rather than a
 * generic educational icon, so the listing reads as mathematics at a glance.
 */
const TOPIC_MOTIF: Record<string, ReactNode> = {
  arithmeticFluency: '+',
  geometryAnglesTriangles: '△',
  divisionWithRemainder: '÷',
  simpleFractions: '½',
  fractionsPart1: '¾',
  multiplication: '×',
  penaltyShootout: '+',
  coordinateSystem: <GridGlyph className="card-icon-svg" />,
  signedNumbers: '±',
  fractions: '⅓',
  geometry: '∠',
  algebraBasics: 'x²',
};

export function GradePage() {
  const { t } = useTranslation();
  const { gradeId } = useParams<{ gradeId: string }>();
  const grade = grades.find((g) => g.id === Number(gradeId));

  if (!grade || !grade.enabled) {
    return <Navigate to="/" replace />;
  }

  const topics = getTopicsForGrade(grade.id);

  return (
    <PageLayout
      title={t('app.chooseTopic')}
      subtitle={t('gradePage.subtitle')}
      context={t(`grades.${grade.id}`)}
      backTo="/"
      backLabel={t('nav.allGrades')}
    >
      <div className="row-list">
        {topics.map((topic, index) => (
          <Card
            key={topic.id}
            layout="row"
            accent={index % 2 === 0 ? 'mint' : 'purple'}
            title={t(`topics.${topic.id}.name`)}
            description={t(`topics.${topic.id}.description`)}
            icon={<span dir="ltr">{TOPIC_MOTIF[topic.id] ?? '×'}</span>}
            to={topic.enabled ? topic.path : undefined}
            disabled={!topic.enabled}
          />
        ))}
      </div>
    </PageLayout>
  );
}
