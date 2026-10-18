import { useTranslation } from 'react-i18next';
import { PlaceValueTrainingScene } from '../components/PlaceValueQuestionScene';
import { BasketballMonkeyCourt } from '../components/BasketballMonkeyCourt';
import { decimalPlaceValueActivity } from '../data/games/decimalPlaceValueData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';

const DECIMAL_PLACE_VALUE_PATH = '/grade/4/decimal-place-value';

/**
 * Wrapped in the real, unmodified `BasketballMonkeyCourt` — the same
 * component the multiplication game uses — for the whole page, not just
 * the digit-value questions it actually animates. `BasketballMonkeyCourt`
 * only reacts to a click landing on a `.tr-option` element (see its own
 * click handler), so this is inert decoration during this skill's other
 * (numeric-entry) questions and springs to life for its multiple-choice
 * ones, with no per-question wiring needed here at all.
 */
export function DecimalPlaceValuePage() {
  const { t } = useTranslation();
  return (
    <BasketballMonkeyCourt>
      <TrainingActivityScreen
        activity={decimalPlaceValueActivity}
        titleKey="decimalPlaceValue.gameName"
        promptKey="decimalPlaceValue.prompt"
        contextLabel={t('grades.4')}
        backTo={DECIMAL_PLACE_VALUE_PATH}
        backLabel={t('decimalExamPrepPage.title')}
        hideBuiltinFeedback
        feedbackTiming={{ correct: 900, wrong: 2200 }}
        renderQuestion={(props) => <PlaceValueTrainingScene {...props} />}
      />
    </BasketballMonkeyCourt>
  );
}
