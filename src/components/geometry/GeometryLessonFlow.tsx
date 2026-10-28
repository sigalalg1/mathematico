import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import './GeometryLesson.css';

/** One step of a guided lesson — typically one `ConceptIntro`. */
export interface LessonStep {
  id: string;
  render: (helpers: { markTried: () => void; tried: boolean }) => ReactNode;
}

interface GeometryLessonFlowProps {
  steps: LessonStep[];
  onComplete: () => void;
  skipLabelKey: string;
  nextLabelKey: string;
  backLabelKey: string;
  startPracticeLabelKey: string;
}

/**
 * The "smallest compatible extension" this unit needed beyond the existing
 * Training engine (see mission brief, Part E): a short guided lesson —
 * several `ConceptIntro` steps the child pages through — shown *before* a
 * group's `TrainingActivityScreen` practice session. The Training engine
 * itself is untouched; this is a separate, reusable stepper that any page
 * composes in front of it, exactly like `AnglesConstructPage` already
 * composes bespoke UI around the shared primitives rather than needing a
 * training-engine change.
 */
export function GeometryLessonFlow({ steps, onComplete, skipLabelKey, nextLabelKey, backLabelKey, startPracticeLabelKey }: GeometryLessonFlowProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [triedByStep, setTriedByStep] = useState<Record<number, boolean>>({});
  const isLast = index === steps.length - 1;
  const step = steps[index];

  return (
    <div className="geo-lesson-flow" data-testid="geo-lesson-flow">
      <div className="geo-lesson-progress" dir="ltr" data-testid="geo-lesson-progress">
        {index + 1}/{steps.length}
      </div>
      <div key={step.id} className="geo-lesson-step">
        {step.render({
          markTried: () => setTriedByStep((prev) => (prev[index] ? prev : { ...prev, [index]: true })),
          tried: Boolean(triedByStep[index]),
        })}
      </div>
      <div className="geo-lesson-controls">
        <button type="button" className="geo-lesson-skip" onClick={onComplete} data-testid="geo-lesson-skip">
          {t(skipLabelKey)}
        </button>
        <div className="geo-lesson-nav">
          {index > 0 && (
            <button type="button" className="geo-lesson-back" data-testid="geo-lesson-back" onClick={() => setIndex((i) => i - 1)}>
              {t(backLabelKey)}
            </button>
          )}
          <button type="button" className="geo-lesson-next" data-testid="geo-lesson-next" onClick={() => (isLast ? onComplete() : setIndex((i) => i + 1))}>
            {t(isLast ? startPracticeLabelKey : nextLabelKey)}
          </button>
        </div>
      </div>
    </div>
  );
}
