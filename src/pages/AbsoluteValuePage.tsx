import { useTranslation } from 'react-i18next';
import { NumberLine, type NumberLineMarker, type NumberLineSpan } from '../components/NumberLine';
import { MathText } from '../components/MathText';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { absoluteValueActivity } from '../data/games/absoluteValueData';
import type { AbsoluteChallenge } from '../types/absoluteValue';
import './SignedNumbersShared.css';

const SIGNED_NUMBERS_PATH = '/grade/7/signed-numbers';

export function AbsoluteValuePage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={absoluteValueActivity}
      titleKey="absoluteValue.gameName"
      promptKey="absoluteValue.prompt.solve"
      contextLabel={t('grades.7')}
      backTo={SIGNED_NUMBERS_PATH}
      backLabel={t('signedNumbersPage.title')}
      renderQuestion={(props) => <AbsoluteValueQuestion {...props} />}
      feedbackTiming={{ correct: 900, wrong: 1800 }}
    />
  );
}

function AbsoluteValueQuestion({
  question,
  phase,
  lastAnswer,
  submit,
}: TrainingQuestionRenderProps<AbsoluteChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const correct = answered && lastAnswer?.isCorrect;
  const usesInteractiveLine = challenge.kind === 'distance';
  const markers: NumberLineMarker[] = challenge.showNumberLine
    ? [...new Set(challenge.values)].map((value, index) => ({
        id: `value-${index}`,
        value,
        label: String(value),
        variant: 'start',
      }))
    : [];
  const spans: NumberLineSpan[] =
    challenge.showNumberLine && (answered || challenge.kind === 'distance')
      ? challenge.values.map((value, index) => ({
          id: `distance-${index}`,
          from: 0,
          to: value,
          label: String(Math.abs(value)),
          variant: correct ? 'correct' : 'default',
        }))
      : [];

  return (
    <section className="absolute-scene" data-kind={challenge.kind}>
      <p className="absolute-concept">{t('absoluteValue.distancePrinciple')}</p>
      <p className="absolute-prompt">{t(`absoluteValue.prompt.${challenge.kind}`)}</p>
      <MathText className="absolute-expression">{challenge.expression}</MathText>

      {challenge.showNumberLine && (
        <NumberLine
          size="lg"
          min={challenge.min}
          max={challenge.max}
          markers={markers}
          spans={spans}
          labeledValues={[-challenge.max, 0, challenge.max]}
          clickablePoints={
            usesInteractiveLine
              ? question.options.map((option) => ({ id: `answer-${option}`, value: Number(option), label: option }))
              : []
          }
          onSelectPoint={(id) => submit(id.replace('answer-', ''))}
          selectedPointId={lastAnswer ? `answer-${lastAnswer.value}` : null}
          correctPointId={correct ? `answer-${question.answer}` : null}
          pointsAnswered={phase === 'feedback'}
          pointsLocked={phase === 'feedback'}
        />
      )}

      {!usesInteractiveLine && (
        <div className="absolute-options">
          {question.options.map((option) => {
            const state =
              answered && option === question.answer
                ? ' is-correct'
                : answered && option === lastAnswer?.value
                  ? ' is-wrong'
                  : '';
            return (
              <button
                key={option}
                type="button"
                className={`absolute-option${state}`}
                disabled={phase === 'feedback'}
                onClick={() => submit(option)}
              >
                <MathText>{option}</MathText>
              </button>
            );
          })}
        </div>
      )}

      {answered && lastAnswer && (
        <div className={`absolute-explanation ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`}>
          <p>{t(lastAnswer.isCorrect ? 'absoluteValue.feedback.correct' : challenge.feedbackKey)}</p>
          <MathText>{challenge.steps.join(' · ')}</MathText>
        </div>
      )}
    </section>
  );
}
