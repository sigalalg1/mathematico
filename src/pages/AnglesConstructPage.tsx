import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Point } from '../types/geometry';
import { GeometryStage } from '../components/geometry/GeometryStage';
import { GeoAngleArc, GeoHandle, GeoPoint, GeoRay } from '../components/geometry/GeometryPrimitives';
import { useDragHandle } from '../components/geometry/useDragHandle';
import { grade7GeometryStyle } from '../geometry/style';
import { angleBetweenRays, classifyAngle7 } from '../geometry/angleMath';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { anglesConstructActivity } from '../data/games/anglesConstructData';
import type { AngleConstructChallenge } from '../types/anglesGrade7';
import './AnglesGrade7Shared.css';

const GEOMETRY_PATH = '/grade/7/geometry';

export function AnglesConstructPage() {
  const { t } = useTranslation();
  return (
    <TrainingActivityScreen
      activity={anglesConstructActivity}
      titleKey="anglesGrade7.construct.gameName"
      promptKey="anglesGrade7.construct.prompt"
      contextLabel={t('grades.7')}
      backTo={GEOMETRY_PATH}
      backLabel={t('geometryGrade7Page.title')}
      renderQuestion={(props) => <AnglesConstructQuestion key={props.question.id} {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 1100, wrong: 2200 }}
    />
  );
}

/** Minimum distance (viewBox units) the dragged point must be from the vertex before its direction is trusted — guards against a jittery, near-degenerate angle reading right at the vertex. */
const MIN_DRAG_DISTANCE = 20;

function AnglesConstructQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<AngleConstructChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const style = grade7GeometryStyle;

  // The parent passes `key={question.id}` so a fresh question remounts this
  // component outright and always starts from its own designed starting
  // position — no effect-driven reset needed.
  const [draggableThrough, setDraggableThrough] = useState<Point>(challenge.startDraggableThrough);

  const { dragging, handlers } = useDragHandle({
    viewBox: style.viewBox,
    disabled: phase === 'feedback',
    onDrag: (point) => {
      if (Math.hypot(point.x - challenge.vertex.x, point.y - challenge.vertex.y) < MIN_DRAG_DISTANCE) return;
      setDraggableThrough(point);
    },
  });

  const currentDegrees = angleBetweenRays(challenge.vertex, challenge.fixedThrough, draggableThrough);
  const currentType = classifyAngle7(currentDegrees);

  const prompt = t(challenge.promptKey, challenge.promptValues ?? {});

  function handleCheck() {
    if (challenge.targetDegrees !== undefined) {
      const withinTolerance = Math.abs(currentDegrees - challenge.targetDegrees) <= challenge.toleranceDeg;
      submit(withinTolerance ? String(challenge.targetDegrees) : String(Math.round(currentDegrees)));
    } else {
      submit(currentType);
    }
  }

  return (
    <section className="angles7-scene" data-kind="construct">
      <p className="angles7-prompt">{prompt}</p>

      <GeometryStage style={style} label={prompt} interactive>
        <GeoRay vertex={challenge.vertex} through={challenge.fixedThrough} style={style} testId="geo-construct-fixed-ray" />
        <GeoRay vertex={challenge.vertex} through={draggableThrough} style={style} color={style.colors.handleActive} testId="geo-construct-draggable-ray" />
        <GeoAngleArc
          vertex={challenge.vertex}
          fromThrough={challenge.fixedThrough}
          toThrough={draggableThrough}
          style={style}
          type={currentType}
          colorIndex={0}
          testId="geo-construct-arc"
        />
        <GeoPoint point={challenge.vertex} style={style} emphasis="vertex" />
        <GeoHandle
          point={draggableThrough}
          style={style}
          active={dragging}
          ariaLabel={t('anglesGrade7.construct.handleLabel')}
          testId="geo-construct-handle"
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onPointerCancel={handlers.onPointerCancel}
        />
      </GeometryStage>

      <p className="angles7-live-readout" data-testid="angles-construct-readout">
        {t('anglesGrade7.construct.liveReadout', { degrees: Math.round(currentDegrees), type: t(`anglesGrade7.types.typeLabel.${currentType}`) })}
      </p>

      <div className="angles7-construct-controls">
        <button type="button" className="angles7-check-button" disabled={phase === 'feedback'} onClick={handleCheck} data-testid="angles-construct-check">
          {t('anglesGrade7.construct.checkButton')}
        </button>
      </div>

      {answered && lastAnswer && (
        <p className={`angles7-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
        </p>
      )}
    </section>
  );
}
