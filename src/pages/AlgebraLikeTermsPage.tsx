import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { algebraLikeTermsActivity, classifyLikeTermsMistake } from '../data/games/algebraLikeTermsData';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import type { AlgebraTerm } from '../utils/algebra';
import type { LikeTermsPayload } from '../data/games/algebraLikeTermsData';
import './AlgebraShared.css';

const ALGEBRA_PATH = '/grade/7/algebra';

function TermTokens({ terms }: { terms: AlgebraTerm[] }) {
  return (
    <div className="algebra-terms" dir="ltr">
      {terms.map((term, index) => {
        const magnitude = Math.abs(term.coefficient);
        const symbol = term.isVariable ? (magnitude === 1 ? 'x' : `${magnitude}x`) : `${magnitude}`;
        const sign = term.coefficient < 0 ? '-' : index === 0 ? '' : '+';
        return (
          <span key={index} className={term.isVariable ? 'algebra-term-variable' : 'algebra-term-constant'}>
            {sign} {symbol}
          </span>
        );
      })}
    </div>
  );
}

function LikeTermsScene({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<LikeTermsPayload>) {
  const { t } = useTranslation();
  const { terms } = question.payload!;
  const locked = phase === 'feedback';
  const mistake = phase !== 'answering' && lastAnswer && !lastAnswer.isCorrect ? classifyLikeTermsMistake(terms, lastAnswer.value) : null;

  return (
    <div className="algebra-activity">
      <p className="algebra-activity-prompt">{t('algebraLikeTerms.prompt')}</p>
      <TermTokens terms={terms} />

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

      {mistake && (
        <div className="algebra-feedback algebra-feedback-hint" data-testid="algebra-like-terms-hint">
          <p>{t(`algebraLikeTerms.feedback.${mistake}`)}</p>
        </div>
      )}
    </div>
  );
}

export function AlgebraLikeTermsPage() {
  const { t } = useTranslation();

  return (
    <TrainingActivityScreen
      activity={algebraLikeTermsActivity}
      titleKey="algebraLikeTerms.gameName"
      promptKey="algebraLikeTerms.prompt"
      contextLabel={t('grades.7')}
      backTo={ALGEBRA_PATH}
      backLabel={t('algebraPage.title')}
      renderQuestion={(props) => <LikeTermsScene key={props.question.id} {...props} />}
    />
  );
}
