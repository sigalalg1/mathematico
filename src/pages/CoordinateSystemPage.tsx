import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { Card } from '../components/Card';
import { coordinateSystemGames } from '../data/games';

export function CoordinateSystemPage() {
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t('coordinateSystemPage.title')}
      subtitle={t('coordinateSystemPage.subtitle')}
      backTo="/grade/7"
      backLabel={t('nav.grade7Topics')}
    >
      <div className="card-grid">
        {coordinateSystemGames.map((game) => (
          <Card
            key={game.id}
            title={t(game.nameKey)}
            description={t(game.descriptionKey)}
            icon={game.enabled ? '📈' : '🎮'}
            to={game.enabled ? game.path : undefined}
            disabled={!game.enabled}
          />
        ))}
      </div>
    </PageLayout>
  );
}
