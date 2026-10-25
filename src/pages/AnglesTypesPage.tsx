import { useTranslation } from 'react-i18next';
import { VertexSceneView } from '../components/geometry/VertexSceneView';
import { grade7GeometryStyle } from '../geometry/style';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { anglesTypesActivity } from '../data/games/anglesTypesData';
import type { AngleTypeChallenge } from '../types/anglesGrade7';
import type { AngleType7 } from '../geometry/types';
import './AnglesGrade7Shared.css';

const GEOMETRY_PATH = '/grade/7/geometry';

export function AnglesTypesPage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={anglesTypesActivity}
      titleKey="anglesGrade7.types.gameName"
      promptKey="anglesGrade7.types.prompt"
      contextLabel={t('grades.7')}
      backTo={GEOMETRY_PATH}
      backLabel={t('geometryGrade7Page.title')}
      renderQuestion={(props) => <AnglesTypesQuestion {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

const TYPE_ORDER: AngleType7[] = ['acute', 'right', 'obtuse', 'straight'];

function AnglesTypesQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<AngleTypeChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';

  if (challenge.kind === 'classify') {
    const prompt = t('anglesGrade7.types.prompt.classify');
    return (
      <section className="angles7-scene" data-kind="classify">
        <p className="angles7-prompt">{prompt}</p>
        <VertexSceneView
          scene={challenge.scene}
          style={grade7GeometryStyle}
          label={prompt}
          angles={[{ id: 'main', ref: challenge.ref, colorIndex: 0 }]}
        />
        <div className="angles7-options">
          {TYPE_ORDER.filter((type) => question.options.includes(type)).map((type) => {
            const state = answered && type === question.answer ? ' is-correct' : answered && type === lastAnswer?.value ? ' is-wrong' : '';
            return (
              <button
                key={type}
                type="button"
                className={`angles7-option${state}`}
                disabled={phase === 'feedback'}
                onClick={() => submit(type)}
              >
                {t(`anglesGrade7.types.typeLabel.${type}`)}
              </button>
            );
          })}
        </div>
        {answered && lastAnswer && (
          <p className={`angles7-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
            {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
          </p>
        )}
      </section>
    );
  }

  const prompt = t(`anglesGrade7.types.prompt.order.${challenge.mode}`);
  return (
    <section className="angles7-scene" data-kind="order">
      <p className="angles7-prompt">{prompt}</p>
      <div className="angles7-order-grid">
        {challenge.options.map((option) => {
          const state = answered && option.id === question.answer ? ' is-correct' : answered && option.id === lastAnswer?.value ? ' is-wrong' : '';
          return (
            <button
              key={option.id}
              type="button"
              className={`angles7-order-option${state}`}
              disabled={phase === 'feedback'}
              onClick={() => submit(option.id)}
              aria-label={t('anglesGrade7.types.orderOptionLabel')}
            >
              <VertexSceneView scene={option.scene} style={grade7GeometryStyle} label={t('anglesGrade7.types.orderOptionLabel')} angles={[{ id: option.id, ref: option.ref }]} showRayLabels={false} showVertexLabel={false} />
            </button>
          );
        })}
      </div>
      {answered && lastAnswer && (
        <p className={`angles7-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
        </p>
      )}
    </section>
  );
}
