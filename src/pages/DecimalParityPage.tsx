import { useTranslation } from 'react-i18next';
import { PlaceValueTrainingScene } from '../components/PlaceValueQuestionScene';
import { decimalParityActivity } from '../data/games/decimalParityData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';

const DECIMAL_PLACE_VALUE_PATH = '/grade/4/decimal-place-value';

export function DecimalParityPage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={decimalParityActivity}
      titleKey="decimalParity.gameName"
      promptKey="decimalParity.prompt"
      contextLabel={t('grades.4')}
      backTo={DECIMAL_PLACE_VALUE_PATH}
      backLabel={t('decimalExamPrepPage.title')}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 1300, wrong: 2400 }}
      renderQuestion={(props) => <PlaceValueTrainingScene {...props} />}
    />
  );
}
