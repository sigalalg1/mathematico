import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { VertexSceneView } from '../components/geometry/VertexSceneView';
import { grade7GeometryStyle } from '../geometry/style';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { anglesIdentifyActivity } from '../data/games/anglesIdentifyData';
import type { AngleIdentifyChallenge } from '../types/anglesGrade7';
import './AnglesGrade7Shared.css';

const GEOMETRY_PATH = '/grade/7/geometry';

export function AnglesIdentifyPage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={anglesIdentifyActivity}
      titleKey="anglesGrade7.identify.gameName"
      promptKey="anglesGrade7.identify.prompt"
      contextLabel={t('grades.7')}
      backTo={GEOMETRY_PATH}
      backLabel={t('geometryGrade7Page.title')}
      renderQuestion={(props) => <AnglesIdentifyQuestion {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function AnglesIdentifyQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<AngleIdentifyChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';

  const prompt = t(challenge.promptKey, challenge.promptValues ?? {});

  return (
    <section className="angles7-scene" data-kind={challenge.kind}>
      <p className="angles7-prompt">{prompt}</p>

      {challenge.kind === 'vertex' && (
        <VertexSceneView
          scene={challenge.scene}
          style={grade7GeometryStyle}
          label={prompt}
          clickablePoints={(challenge.pointOptionIds ?? []).map((id) => ({
            id,
            ariaLabel: id === 'vertex' ? challenge.scene.vertex.label : challenge.scene.rays.find((r) => r.id === id)!.label,
            selected: lastAnswer?.value === id,
            onClick: () => submit(id),
          }))}
        />
      )}

      {challenge.kind === 'rays' && (
        <>
          <VertexSceneView
            scene={challenge.scene}
            style={grade7GeometryStyle}
            label={prompt}
            angles={challenge.angleOptions!.map((option) => ({ id: option.id, ref: option.ref, colorIndex: 1 }))}
          />
          <div className="angles7-options">
            {challenge.rayPairOptions!.map((option) => {
              const state = answered && option.id === question.answer ? ' is-correct' : answered && option.id === lastAnswer?.value ? ' is-wrong' : '';
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`angles7-option${state}`}
                  disabled={phase === 'feedback'}
                  onClick={() => submit(option.id)}
                >
                  <MathText>{`${option.labels[0]}, ${option.labels[1]}`}</MathText>
                </button>
              );
            })}
          </div>
        </>
      )}

      {challenge.kind === 'angle' && (
        <VertexSceneView
          scene={challenge.scene}
          style={grade7GeometryStyle}
          label={prompt}
          clickableAngles={challenge.angleOptions!.map((option, index) => ({
            id: option.id,
            ref: option.ref,
            radiusIndex: index,
            ariaLabel: t('anglesGrade7.identify.angleOptionLabel', { index: index + 1 }),
            selected: lastAnswer?.value === option.id,
            onClick: () => submit(option.id),
          }))}
        />
      )}

      {answered && lastAnswer && (
        <p className={`angles7-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
        </p>
      )}
    </section>
  );
}
