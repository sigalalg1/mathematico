import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { algebraExpressionsActivity } from '../data/games/algebraExpressionsData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import type { ExpressionPayload } from '../data/games/algebraExpressionsData';
import './AlgebraShared.css';

const ALGEBRA_PATH = '/grade/7/algebra';

function ExpressionScene({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<ExpressionPayload>) {
  const { t } = useTranslation();
  const payload = question.payload!;
  const locked = phase === 'feedback';

  return (
    <div className="algebra-activity">
      <p className="algebra-activity-prompt">
        {t(`algebraExpressions.phrases.${payload.templateId}`, { n: payload.n, n2: payload.n2 ?? undefined })}
      </p>

      <div className="algebra-options">
        {question.options.map((option) => {
          const classes = ['algebra-option'];
          if (phase !== 'answering' && lastAnswer) {
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

export function AlgebraExpressionsPage() {
  const { t } = useTranslation();

  return (
    <TrainingActivityScreen
      activity={algebraExpressionsActivity}
      titleKey="algebraExpressions.gameName"
      promptKey="algebraExpressions.prompt"
      contextLabel={t('grades.7')}
      backTo={ALGEBRA_PATH}
      backLabel={t('algebraPage.title')}
      renderQuestion={(props) => <ExpressionScene key={props.question.id} {...props} />}
    />
  );
}
