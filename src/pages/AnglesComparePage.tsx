import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { VertexSceneView } from '../components/geometry/VertexSceneView';
import { grade7GeometryStyle } from '../geometry/style';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { anglesCompareActivity } from '../data/games/anglesCompareData';
import type { AngleCompareChallenge } from '../types/anglesGrade7';
import './AnglesGrade7Shared.css';
import './AnglesComparePage.css';

const GEOMETRY_PATH = '/grade/7/geometry';

export function AnglesComparePage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={anglesCompareActivity}
      titleKey="anglesGrade7.compare.gameName"
      promptKey="anglesGrade7.compare.prompt"
      contextLabel={t('grades.7')}
      backTo={GEOMETRY_PATH}
      backLabel={t('geometryGrade7Page.title')}
      renderQuestion={(props) => <AnglesCompareQuestion {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function AnglesCompareQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<AngleCompareChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const prompt = t('anglesGrade7.compare.prompt.compare');
  const leftName = `${challenge.left.scene.rays[0].label}${challenge.left.scene.vertex.label}${challenge.left.scene.rays[1].label}`;
  const rightName = `${challenge.right.scene.rays[0].label}${challenge.right.scene.vertex.label}${challenge.right.scene.rays[1].label}`;

  return (
    <section className="angles7-scene" data-kind="compare">
      <p className="angles7-prompt">{prompt}</p>
      <div className="angles7-compare-row">
        <div className="angles7-compare-side">
          <MathText className="angles7-compare-label">{`∠${leftName}`}</MathText>
          <VertexSceneView scene={challenge.left.scene} style={grade7GeometryStyle} label={`∠${leftName}`} angles={[{ id: 'left', ref: challenge.left.ref }]} />
        </div>
        <div className="angles7-compare-sign">{answered ? <MathText>{question.answer}</MathText> : '?'}</div>
        <div className="angles7-compare-side">
          <MathText className="angles7-compare-label">{`∠${rightName}`}</MathText>
          <VertexSceneView scene={challenge.right.scene} style={grade7GeometryStyle} label={`∠${rightName}`} angles={[{ id: 'right', ref: challenge.right.ref, colorIndex: 1 }]} />
        </div>
      </div>

      <div className="angles7-options">
        {question.options.map((option) => {
          const state = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
          return (
            <button key={option} type="button" className={`angles7-option${state}`} disabled={phase === 'feedback'} onClick={() => submit(option)}>
              <MathText>{option}</MathText>
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
