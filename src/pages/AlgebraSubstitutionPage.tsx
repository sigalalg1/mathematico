import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { formatLinearExpr, formatSubstitutionSteps } from '../utils/algebra';
import { algebraSubstitutionActivity } from '../data/games/algebraSubstitutionData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import type { SubstitutionPayload } from '../data/games/algebraSubstitutionData';
import './AlgebraShared.css';

const ALGEBRA_PATH = '/grade/7/algebra';

function SubstitutionScene({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<SubstitutionPayload>) {
  const { t } = useTranslation();
  const { expr, x } = question.payload!;
  const locked = phase === 'feedback';
  // The replacement-then-compute derivation only means something once the
  // child has committed to an answer — showing it earlier would hand over
  // the answer before the question was asked.
  const showSteps = phase !== 'answering' && lastAnswer !== null;

  return (
    <div className="algebra-activity">
      <p className="algebra-activity-prompt">{t('algebraSubstitution.prompt', { x })}</p>
      <MathText className="algebra-expression">
        {formatLinearExpr(expr)}, x = {x}
      </MathText>

      {showSteps && (
        <div className="algebra-machine" data-testid="algebra-substitution-steps">
          {formatSubstitutionSteps(expr, x).map((step, index) => (
            <MathText key={index} className="algebra-machine-row">
              {step}
            </MathText>
          ))}
        </div>
      )}

      <div className="algebra-options">
        {question.options.map((option) => {
          const classes = ['algebra-option'];
          if (lastAnswer) {
            if (option === lastAnswer.correctAnswer) classes.push('is-correct');
            else if (option === lastAnswer.value) classes.push('is-wrong');
          }
          return (
            <button
              key={option}
              type="button"
              className={classes.join(' ')}
              data-testid={`algebra-option-${option}`}
              disabled={locked}
              onClick={() => submit(option)}
            >
              <MathText>{option}</MathText>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AlgebraSubstitutionPage() {
  const { t } = useTranslation();

  return (
    <TrainingActivityScreen
      activity={algebraSubstitutionActivity}
      titleKey="algebraSubstitution.gameName"
      promptKey="algebraSubstitution.prompt"
      contextLabel={t('grades.7')}
      backTo={ALGEBRA_PATH}
      backLabel={t('algebraPage.title')}
      renderQuestion={(props) => <SubstitutionScene key={props.question.id} {...props} />}
    />
  );
}
