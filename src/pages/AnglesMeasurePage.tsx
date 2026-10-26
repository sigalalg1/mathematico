import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VertexSceneView } from '../components/geometry/VertexSceneView';
import { grade7GeometryStyle } from '../geometry/style';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { anglesMeasureActivity } from '../data/games/anglesMeasureData';
import type { AngleMeasureChallenge } from '../types/anglesGrade7';
import type { VertexScene } from '../geometry/types';
import './AnglesGrade7Shared.css';
import './AnglesMeasurePage.css';

const GEOMETRY_PATH = '/grade/7/geometry';

export function AnglesMeasurePage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={anglesMeasureActivity}
      titleKey="anglesGrade7.measure.gameName"
      promptKey="anglesGrade7.measure.prompt"
      contextLabel={t('grades.7')}
      backTo={GEOMETRY_PATH}
      backLabel={t('geometryGrade7Page.title')}
      renderQuestion={(props) => <AnglesMeasureQuestion key={props.question.id} {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 1100, wrong: 2400 }}
    />
  );
}

function AnglesMeasureQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<AngleMeasureChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const style = grade7GeometryStyle;
  const prompt = t(challenge.promptKey);

  // Reset per question by the parent's `key={question.id}` remount.
  const [value, setValue] = useState('');

  const scene: VertexScene = {
    vertex: { id: 'vertex', label: '', point: challenge.vertex },
    rays: [
      { id: 'fixed', label: '', through: challenge.fixedThrough },
      { id: 'measured', label: '', through: challenge.measuredThrough },
    ],
  };

  function handleCheck() {
    const parsed = Number(value);
    const withinTolerance = Number.isFinite(parsed) && Math.abs(parsed - challenge.targetDegrees) <= challenge.toleranceDeg;
    submit(withinTolerance ? String(challenge.targetDegrees) : String(Number.isFinite(parsed) ? Math.round(parsed) : -1));
  }

  return (
    <section className="angles7-scene" data-kind="measure">
      <p className="angles7-prompt">{prompt}</p>

      <VertexSceneView
        scene={scene}
        style={style}
        label={prompt}
        showRayLabels={false}
        showVertexLabel
        protractor={{ baselineRayId: 'fixed' }}
      />

      <div className="angles7-measure-controls">
        <label className="angles7-measure-label" htmlFor="angles-measure-input">
          {t('anglesGrade7.measure.inputLabel')}
        </label>
        <input
          id="angles-measure-input"
          type="number"
          inputMode="numeric"
          min={0}
          max={180}
          step={1}
          className="angles7-measure-input"
          data-testid="angles-measure-input"
          value={value}
          disabled={phase === 'feedback'}
          onChange={(event) => setValue(event.target.value)}
        />
        <span className="angles7-measure-degree-sign" aria-hidden="true">
          °
        </span>
        <button
          type="button"
          className="angles7-check-button"
          disabled={phase === 'feedback' || value === ''}
          onClick={handleCheck}
          data-testid="angles-measure-check"
        >
          {t('anglesGrade7.measure.checkButton')}
        </button>
      </div>

      {answered && lastAnswer && (
        <p className={`angles7-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {lastAnswer.isCorrect
            ? t('training.feedback.correct')
            : t(challenge.feedbackKey, { given: lastAnswer.value, correct: lastAnswer.correctAnswer })}
        </p>
      )}
    </section>
  );
}
