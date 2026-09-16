import { useTranslation } from 'react-i18next';
import { BasketballMonkeyCourt } from '../components/BasketballMonkeyCourt';
import { basketballMonkeyActivity } from '../data/games/basketballMonkeyData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';

const TOPIC_PATH = '/grade/4/multiplication';

/**
 * Two-digit-by-one-digit multiplication on the court. The court itself is
 * reusable and knows nothing about multiplication — the grade 2 arithmetic
 * skills render inside the very same one.
 */
export function BasketballMonkeyPage() {
  const { t } = useTranslation();

  return (
    <BasketballMonkeyCourt>
      <TrainingActivityScreen
        activity={basketballMonkeyActivity}
        titleKey="basketballMonkey.gameName"
        promptKey="basketballMonkey.prompt"
        contextLabel={t('grades.4')}
        backTo={TOPIC_PATH}
        backLabel={t('multiplicationPage.title')}
      />
    </BasketballMonkeyCourt>
  );
}
