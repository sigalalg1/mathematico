import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { VertexSceneView } from '../components/geometry/VertexSceneView';
import { TriangleSceneView } from '../components/geometry/TriangleSceneView';
import { grade7GeometryStyle } from '../geometry/style';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { anglesNotationActivity } from '../data/games/anglesNotationData';
import type { AngleNotationChallenge } from '../types/anglesGrade7';
import './AnglesGrade7Shared.css';

const GEOMETRY_PATH = '/grade/7/geometry';

export function AnglesNotationPage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={anglesNotationActivity}
      titleKey="anglesGrade7.notation.gameName"
      promptKey="anglesGrade7.notation.prompt"
      contextLabel={t('grades.7')}
      backTo={GEOMETRY_PATH}
      backLabel={t('geometryGrade7Page.title')}
      renderQuestion={(props) => <AnglesNotationQuestion {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function AnglesNotationQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<AngleNotationChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const prompt = t(challenge.promptKey, challenge.promptValues ?? {});

  return (
    <section className="angles7-scene" data-kind={challenge.kind}>
      <p className="angles7-prompt">{prompt}</p>

      {challenge.kind === 'triangleInterior' ? (
        <TriangleSceneView
          triangle={challenge.triangle!}
          style={grade7GeometryStyle}
          label={prompt}
          highlightedVertexIndex={challenge.highlightedVertexIndex}
        />
      ) : (
        <VertexSceneView
          scene={challenge.scene!}
          style={grade7GeometryStyle}
          label={prompt}
          angles={[
            {
              id: 'highlighted',
              ref: challenge.highlightedRef!,
              colorIndex: 0,
              label: challenge.usesGreekLetter ? challenge.promptValues?.letter : undefined,
            },
          ]}
        />
      )}

      <div className="angles7-options">
        {challenge.options.map((option) => {
          const state = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
          return (
            <button key={option} type="button" className={`angles7-option${state}`} disabled={phase === 'feedback'} onClick={() => submit(option)}>
              <MathText>{`∠${option}`}</MathText>
            </button>
          );
        })}
      </div>

      {answered && lastAnswer && (
        <p className={`angles7-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
          {' — '}
          <MathText>{`∠${lastAnswer.correctAnswer}`}</MathText>
        </p>
      )}
    </section>
  );
}
