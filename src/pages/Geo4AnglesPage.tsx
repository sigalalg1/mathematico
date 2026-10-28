import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VertexSceneView } from '../components/geometry/VertexSceneView';
import { ConceptIntro } from '../components/geometry/ConceptIntro';
import { GeometryLessonFlow, type LessonStep } from '../components/geometry/GeometryLessonFlow';
import { grade4GeometryStyle } from '../geometry/style';
import { pointFromAngle } from '../geometry/angleMath';
import type { VertexScene } from '../geometry/types';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { geo4AnglesActivity } from '../data/games/grade4GeoAnglesData';
import type { Geo4AngleChallenge } from '../types/geometryGrade4';
import './Grade4GeometryShared.css';

const HUB_PATH = '/grade/4/geometry-foundations';
const style = grade4GeometryStyle;

function demoScene(degrees: number, center = { x: 160, y: 160 }): VertexScene {
  return {
    vertex: { id: 'vertex', label: 'A', point: center },
    rays: [
      { id: 'ray-0', label: 'B', through: pointFromAngle(center, 10, 95) },
      { id: 'ray-1', label: 'C', through: pointFromAngle(center, 10 + degrees, 95) },
    ],
  };
}

function AngleTryIt() {
  const scene = demoScene(60);
  return <VertexSceneView scene={scene} style={style} label="angle demo" angles={[{ id: 'a', ref: { vertexId: 'vertex', rayAId: 'ray-0', rayBId: 'ray-1' }, filled: true }]} />;
}

function AngleVertexTryIt({ markTried }: { markTried: () => void }) {
  const scene = demoScene(60);
  const [tapped, setTapped] = useState(false);
  return (
    <VertexSceneView
      scene={scene}
      style={style}
      label="angle vertex demo"
      clickablePoints={[
        {
          id: 'vertex',
          ariaLabel: scene.vertex.label,
          selected: tapped,
          onClick: () => {
            setTapped(true);
            markTried();
          },
        },
      ]}
    />
  );
}

function AngleArmsTryIt({ markTried }: { markTried: () => void }) {
  const scene = demoScene(70);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return (
    <VertexSceneView
      scene={scene}
      style={style}
      label="angle arms demo"
      clickablePoints={scene.rays.map((ray) => ({
        id: ray.id,
        ariaLabel: ray.label,
        selected: selected.has(ray.id),
        onClick: () => {
          setSelected((prev) => {
            const next = new Set(prev);
            next.add(ray.id);
            if (next.size === scene.rays.length) markTried();
            return next;
          });
        },
      }))}
    />
  );
}

function AngleTypesGallery() {
  const items: { degrees: number; labelKey: string }[] = [
    { degrees: 45, labelKey: 'grade4Geometry.concepts.acuteAngle.term' },
    { degrees: 90, labelKey: 'grade4Geometry.concepts.rightAngle.term' },
    { degrees: 135, labelKey: 'grade4Geometry.concepts.obtuseAngle.term' },
  ];
  return (
    <div className="geo4-gallery-row">
      {items.map((item) => (
        <div key={item.labelKey} className="geo4-gallery-item" style={{ cursor: 'default' }}>
          <VertexSceneView scene={demoScene(item.degrees)} style={style} label={item.labelKey} />
        </div>
      ))}
    </div>
  );
}

function lessonSteps(): LessonStep[] {
  return [
    { id: 'angle', render: () => <ConceptIntro termKey="grade4Geometry.concepts.angle.term" definitionKey="grade4Geometry.concepts.angle.definition" diagram={<AngleTryIt />} /> },
    {
      id: 'angleVertex',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.angleVertex.term"
          definitionKey="grade4Geometry.concepts.angleVertex.definition"
          diagram={<AngleVertexTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.angleVertex.tryIt"
          successKey="grade4Geometry.concepts.angleVertex.success"
          completed={tried}
        />
      ),
    },
    {
      id: 'angleArms',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.angleArms.term"
          definitionKey="grade4Geometry.concepts.angleArms.definition"
          diagram={<AngleArmsTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.angleArms.tryIt"
          successKey="grade4Geometry.concepts.angleArms.success"
          completed={tried}
        />
      ),
    },
    { id: 'angleTypes', render: () => <ConceptIntro termKey="grade4Geometry.concepts.angleTypes.term" definitionKey="grade4Geometry.concepts.angleTypes.definition" diagram={<AngleTypesGallery />} /> },
  ];
}

export function Geo4AnglesPage() {
  const { t } = useTranslation();
  const [lessonDone, setLessonDone] = useState(false);

  if (!lessonDone) {
    return (
      <div className="page page-game">
        <GeometryLessonFlow
          steps={lessonSteps()}
          onComplete={() => setLessonDone(true)}
          skipLabelKey="grade4Geometry.lesson.skip"
          nextLabelKey="grade4Geometry.lesson.next"
          backLabelKey="grade4Geometry.lesson.back"
          startPracticeLabelKey="grade4Geometry.lesson.startPractice"
        />
      </div>
    );
  }

  return (
    <TrainingActivityScreen
      activity={geo4AnglesActivity}
      titleKey="grade4Geometry.angles.gameName"
      promptKey="grade4Geometry.angles.prompt.default"
      contextLabel={t('grades.4')}
      backTo={HUB_PATH}
      backLabel={t('grade4GeometryFoundationsPage.title')}
      renderQuestion={(props) => <Geo4AnglesQuestion key={props.question.id} {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function Geo4AnglesQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<Geo4AngleChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const prompt = t(challenge.promptKey, challenge.promptValues ?? {});
  const locked = phase === 'feedback';
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <section className="geo4-scene" data-kind={challenge.kind}>
      <p className="geo4-prompt">{prompt}</p>

      {challenge.kind === 'tapVertexOrArm' && challenge.scene && (
        <VertexSceneView
          scene={challenge.scene}
          style={style}
          label={prompt}
          clickablePoints={[
            { id: 'vertex', ariaLabel: challenge.scene.vertex.label, onClick: () => !locked && submit('vertex') },
            ...challenge.scene.rays.map((ray) => ({ id: ray.id, ariaLabel: ray.label, onClick: () => !locked && submit('arm') })),
          ]}
        />
      )}

      {(challenge.kind === 'classifyType' || challenge.kind === 'compareRayLength') && challenge.scene && (
        <VertexSceneView
          scene={challenge.scene}
          style={style}
          label={prompt}
          angles={[{ id: 'a', ref: { vertexId: 'vertex', rayAId: challenge.scene.rays[0].id, rayBId: challenge.scene.rays[1].id }, filled: true }]}
        />
      )}

      {(challenge.kind === 'classifyType' || challenge.kind === 'compareRayLength') && (
        <div className="geo4-options">
          {question.options.map((option) => {
            const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
            const labelKey = challenge.kind === 'classifyType' ? `grade4Geometry.angles.typeLabel.${option}` : `grade4Geometry.angles.boolLabel.${option}`;
            return (
              <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      )}

      {challenge.kind === 'selectAllRight' && challenge.gallery && (
        <>
          <div className="geo4-gallery-row">
            {challenge.gallery.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`geo4-gallery-item${selected.has(item.id) ? ' is-correct' : ''}`}
                disabled={locked}
                onClick={() =>
                  !locked &&
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
              >
                <VertexSceneView scene={item.scene} style={style} label={item.id} angles={[{ id: 'a', ref: { vertexId: 'vertex', rayAId: item.scene.rays[0].id, rayBId: item.scene.rays[1].id } }]} />
              </button>
            ))}
          </div>
          <div className="geo4-select-controls">
            <span className="geo4-select-hint">{t('grade4Geometry.angles.selectHint', { count: selected.size })}</span>
            <button type="button" className="geo4-confirm-button" disabled={locked || selected.size === 0} onClick={() => submit([...selected].sort().join(','))}>
              {t('grade4Geometry.angles.confirmSelection')}
            </button>
          </div>
        </>
      )}

      {answered && lastAnswer && (
        <p className={`geo4-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
        </p>
      )}
    </section>
  );
}
