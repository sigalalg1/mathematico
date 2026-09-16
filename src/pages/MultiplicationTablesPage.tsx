import { useTranslation } from 'react-i18next';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import { multiplicationTablesActivity } from '../data/games/multiplicationTablesData';

const TOPIC_PATH = '/grade/4/multiplication';

/**
 * Times-table fluency drill — the first activity built on the training system.
 * Everything on screen (configuration, session, timing, streak, records,
 * results) is generic; this page only names the activity and where it sits.
 */
export function MultiplicationTablesPage() {
  const { t } = useTranslation();

  return (
    <TrainingActivityScreen
      activity={multiplicationTablesActivity}
      titleKey="multiplicationTables.gameName"
      promptKey="multiplicationTables.prompt"
      contextLabel={t('grades.4')}
      backTo={TOPIC_PATH}
      backLabel={t('multiplicationPage.title')}
    />
  );
}
