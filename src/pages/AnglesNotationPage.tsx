import { useState } from 'react';
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
      renderQuestion={(props) => <AnglesNotationQuestion key={props.question.id} {...props} />}
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

  // Local to one question only — the parent remounts this component on every
  // new `question.id`, so a fresh question always starts with nothing toggled.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleOption = (id: string) => {
    if (phase === 'feedback') return;
    setSelectedIds((previous) => (previous.includes(id) ? previous.filter((existing) => existing !== id) : [...previous, id]));
  };

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

      {challenge.kind === 'selectAllNames' ? (
        <>
          <div className="angles7-options">
            {challenge.nameOptions!.map((option) => {
              const isSelected = selectedIds.includes(option.id);
              let state = '';
              let statusKey: string | null = null;
              if (answered) {
                if (option.valid && isSelected) {
                  state = ' is-correct';
                  statusKey = 'anglesGrade7.notation.selectAllNames.status.correct';
                } else if (option.valid && !isSelected) {
                  state = ' is-missed';
                  statusKey = 'anglesGrade7.notation.selectAllNames.status.missed';
                } else if (!option.valid && isSelected) {
                  state = ' is-wrong';
                  statusKey = 'anglesGrade7.notation.selectAllNames.status.incorrect';
                }
              } else if (isSelected) {
                state = ' is-selected';
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`angles7-option${state}`}
                  disabled={phase === 'feedback'}
                  aria-pressed={isSelected}
                  onClick={() => toggleOption(option.id)}
                >
                  <MathText>{`∠${option.name}`}</MathText>
                  {statusKey && <span className="angles7-option-status">{t(statusKey)}</span>}
                </button>
              );
            })}
          </div>
          <div className="angles7-construct-controls">
            <button
              type="button"
              className="angles7-check-button"
              disabled={phase === 'feedback' || selectedIds.length === 0}
              onClick={() => submit([...selectedIds].sort().join(','))}
              data-testid="angles-selectall-check"
            >
              {t('anglesGrade7.notation.selectAllNames.checkButton')}
            </button>
          </div>
        </>
      ) : (
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
      )}

      {answered && lastAnswer && (
        <p className={`angles7-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {challenge.kind === 'selectAllNames' ? (
            t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)
          ) : (
            <>
              {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
              {' — '}
              <MathText>{`∠${lastAnswer.correctAnswer}`}</MathText>
            </>
          )}
        </p>
      )}
    </section>
  );
}
