import { useTranslation } from 'react-i18next';
import { PlaceValueTrainingScene } from '../components/PlaceValueQuestionScene';
import { decimalConstraintsActivity } from '../data/games/decimalConstraintsData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';

const DECIMAL_PLACE_VALUE_PATH = '/grade/4/decimal-place-value';

export function DecimalConstraintsPage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={decimalConstraintsActivity}
      titleKey="decimalConstraints.gameName"
      promptKey="decimalConstraints.prompt"
      contextLabel={t('grades.4')}
      backTo={DECIMAL_PLACE_VALUE_PATH}
      backLabel={t('decimalExamPrepPage.title')}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 600, wrong: 2200 }}
      renderQuestion={(props) => <PlaceValueTrainingScene {...props} />}
    />
  );
}
