import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { grades } from '../data/grades';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <PageLayout title={t('app.title')} subtitle={t('app.subtitle')} brandTitle>
      <div className="card-grid">
        {grades.map((grade) => (
          <Card
            key={grade.id}
            title={t(`grades.${grade.id}`)}
            icon={<span dir="ltr">{grade.id}</span>}
            to={grade.enabled ? `/grade/${grade.id}` : undefined}
            disabled={!grade.enabled}
          />
        ))}
      </div>
    </PageLayout>
  );
}
