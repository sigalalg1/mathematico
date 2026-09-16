import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { grades } from '../data/grades';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <PageLayout title={t('app.title')} subtitle={t('app.subtitle')} brandTitle>
      <div className="card-grid">
        {grades
          .filter((grade) => grade.enabled)
          .map((grade) => (
            <Card key={grade.id} title={t(`grades.${grade.id}`)} icon="🎓" to={`/grade/${grade.id}`} />
          ))}
      </div>
    </PageLayout>
  );
}
