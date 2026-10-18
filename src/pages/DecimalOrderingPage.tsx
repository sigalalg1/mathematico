import { useTranslation } from 'react-i18next';
import { PlaceValueTrainingScene } from '../components/PlaceValueQuestionScene';
import { decimalOrderingActivity } from '../data/games/decimalOrderingData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';

const DECIMAL_PLACE_VALUE_PATH = '/grade/4/decimal-place-value';

export function DecimalOrderingPage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={decimalOrderingActivity}
      titleKey="decimalOrdering.gameName"
      promptKey="decimalOrdering.prompt"
      contextLabel={t('grades.4')}
      backTo={DECIMAL_PLACE_VALUE_PATH}
      backLabel={t('decimalExamPrepPage.title')}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 1300, wrong: 2400 }}
      renderQuestion={(props) => <PlaceValueTrainingScene {...props} />}
    />
  );
}
