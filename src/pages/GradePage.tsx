import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { grades } from '../data/grades';
import { getTopicsForGrade } from '../data/topics';

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
      title={t(`grades.${grade.id}`)}
      subtitle={t('gradePage.subtitle')}
      backTo="/"
      backLabel={t('nav.allGrades')}
    >
      <div className="card-grid">
        {topics.map((topic) => (
          <Card
            key={topic.id}
            title={t(`topics.${topic.id}.name`)}
            description={t(`topics.${topic.id}.description`)}
            icon="📐"
            to={topic.enabled ? topic.path : undefined}
            disabled={!topic.enabled}
          />
        ))}
      </div>
    </PageLayout>
  );
}
