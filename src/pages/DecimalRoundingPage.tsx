import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaceValueTrainingScene } from '../components/PlaceValueQuestionScene';
import { PlayModeToggle } from '../components/PlayModeToggle';
import { decimalRoundingActivity } from '../data/games/decimalRoundingData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';

const DECIMAL_PLACE_VALUE_PATH = '/grade/4/decimal-place-value';

export function DecimalRoundingPage() {
  const { t } = useTranslation();
  const [playful, setPlayful] = useState(false);
  return (
    <TrainingActivityScreen
      activity={decimalRoundingActivity}
      titleKey="decimalRounding.gameName"
      promptKey="decimalRounding.prompt"
      contextLabel={t('grades.4')}
      backTo={DECIMAL_PLACE_VALUE_PATH}
      backLabel={t('decimalExamPrepPage.title')}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 600, wrong: 2200 }}
      setupExtra={<PlayModeToggle playful={playful} onChange={setPlayful} />}
      renderQuestion={(props) => <PlaceValueTrainingScene {...props} gameMode={playful ? 'soccer' : undefined} />}
    />
  );
}
