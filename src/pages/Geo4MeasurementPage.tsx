import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { PolygonSceneView } from '../components/geometry/PolygonSceneView';
import { ConceptIntro } from '../components/geometry/ConceptIntro';
import { GeometryLessonFlow, type LessonStep } from '../components/geometry/GeometryLessonFlow';
import { grade4GeometryStyle } from '../geometry/style';
import { buildPolygonScene, buildPolygonVertexPoints } from '../geometry/polygonScene';
import { createSeededRandom } from '../utils/seededRandom';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { geo4MeasurementActivity } from '../data/games/grade4GeoMeasurementData';
import type { Geo4MeasurementChallenge } from '../types/geometryGrade4';
import './Grade4GeometryShared.css';

const HUB_PATH = '/grade/4/geometry-foundations';
const style = grade4GeometryStyle;

function demoScene() {
  const random = createSeededRandom(42);
  const points = buildPolygonVertexPoints({ x: 160, y: 160 }, 5, 95, { rotationDeg: 10, random });
  return buildPolygonScene('measure-demo', points, ['A', 'B', 'C', 'D', 'E']);
}

function PerimeterTryIt({ markTried, tried }: { markTried: () => void; tried: boolean }) {
  return (
    <PolygonSceneView scene={demoScene()} style={style} label="perimeter demo" showPerimeterTrace perimeterAnimated={tried} fillShape={false}>
      {!tried && <TriggerHint onClick={markTried} />}
    </PolygonSceneView>
  );
}

function TriggerHint({ onClick }: { onClick: () => void }) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect x={0} y={0} width={320} height={320} fill="transparent" />
    </g>
  );
}

function AreaTryIt() {
  return <PolygonSceneView scene={demoScene()} style={style} label="area demo" showAreaFill fillShape={false} />;
}

function SideLengthTryIt({ markTried }: { markTried: () => void }) {
  const scene = demoScene();
  const [highlighted, setHighlighted] = useState(0);
  return (
    <PolygonSceneView
      scene={scene}
      style={style}
      label="side length demo"
      highlightedSideIndices={[highlighted]}
      sideHandles={Array.from({ length: scene.vertices.length }, (_, i) => ({
        index: i,
        ariaLabel: `side ${i}`,
        selected: i === highlighted,
        onClick: () => {
          if (i !== highlighted) {
            setHighlighted(i);
            markTried();
          }
        },
      }))}
    />
  );
}

function UnitsTryIt() {
  const { t } = useTranslation();
  return (
    <div className="geo4-gallery-row">
      <div className="geo4-gallery-item" style={{ cursor: 'default' }}>
        <PolygonSceneView scene={demoScene()} style={style} label="length unit" showPerimeterTrace fillShape={false} />
        <span className="geo4-gallery-caption">
          <MathText>cm</MathText>
        </span>
      </div>
      <div className="geo4-gallery-item" style={{ cursor: 'default' }}>
        <PolygonSceneView scene={demoScene()} style={style} label="area unit" showAreaFill fillShape={false} />
        <span className="geo4-gallery-caption">
          <MathText>{t('grade4Geometry.measurement.squareCmLabel')}</MathText>
        </span>
      </div>
    </div>
  );
}

function lessonSteps(): LessonStep[] {
  return [
    {
      id: 'perimeter',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.perimeter.term"
          definitionKey="grade4Geometry.concepts.perimeter.definition"
          diagram={<PerimeterTryIt markTried={markTried} tried={tried} />}
          tryItKey="grade4Geometry.concepts.perimeter.tryIt"
          successKey="grade4Geometry.concepts.perimeter.success"
          completed={tried}
        />
      ),
    },
    { id: 'area', render: () => <ConceptIntro termKey="grade4Geometry.concepts.area.term" definitionKey="grade4Geometry.concepts.area.definition" diagram={<AreaTryIt />} /> },
    {
      id: 'sideLength',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.sideLength.term"
          definitionKey="grade4Geometry.concepts.sideLength.definition"
          diagram={<SideLengthTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.sideLength.tryIt"
          successKey="grade4Geometry.concepts.sideLength.success"
          completed={tried}
        />
      ),
    },
    { id: 'units', render: () => <ConceptIntro termKey="grade4Geometry.concepts.units.term" definitionKey="grade4Geometry.concepts.units.definition" diagram={<UnitsTryIt />} /> },
  ];
}

export function Geo4MeasurementPage() {
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
      activity={geo4MeasurementActivity}
      titleKey="grade4Geometry.measurement.gameName"
      promptKey="grade4Geometry.measurement.prompt.default"
      contextLabel={t('grades.4')}
      backTo={HUB_PATH}
      backLabel={t('grade4GeometryFoundationsPage.title')}
      renderQuestion={(props) => <Geo4MeasurementQuestion key={props.question.id} {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function Geo4MeasurementQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<Geo4MeasurementChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const locked = phase === 'feedback';
  const prompt = t(challenge.promptKey, challenge.promptValues ?? {});

  return (
    <section className="geo4-scene" data-kind={challenge.kind}>
      <p className="geo4-prompt">{prompt}</p>

      {(challenge.kind === 'whichIsPerimeter' || challenge.kind === 'whichIsArea' || challenge.kind === 'sideLengthVocab') && challenge.gallery && (
        <div className="geo4-gallery-row">
          {challenge.gallery.map((item) => {
            const stateClass = answered && item.id === question.answer ? ' is-correct' : answered && item.id === lastAnswer?.value ? ' is-wrong' : '';
            return (
              <button key={item.id} type="button" className={`geo4-gallery-item${stateClass}`} disabled={locked} onClick={() => submit(item.id)}>
                <PolygonSceneView
                  scene={item.scene}
                  style={style}
                  label={item.id}
                  fillShape={false}
                  showPerimeterTrace={item.mode === 'perimeter'}
                  showAreaFill={item.mode === 'area'}
                  highlightedSideIndices={item.mode === 'sideLength' && item.highlightSideIndex !== undefined ? [item.highlightSideIndex] : []}
                />
              </button>
            );
          })}
        </div>
      )}

      {challenge.kind === 'unitMatch' && challenge.gallery && (
        <>
          <PolygonSceneView
            scene={challenge.gallery[0].scene}
            style={style}
            label={prompt}
            fillShape={false}
            showPerimeterTrace={challenge.gallery[0].mode === 'perimeter'}
            showAreaFill={challenge.gallery[0].mode === 'area'}
          />
          <div className="geo4-options">
            {question.options.map((option) => {
              const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
              return (
                <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                  <MathText>{option === 'cm2' ? t('grade4Geometry.measurement.squareCmLabel') : 'cm'}</MathText>
                </button>
              );
            })}
          </div>
        </>
      )}

      {challenge.kind === 'conceptTrueFalse' && challenge.scene && (
        <>
          <PolygonSceneView scene={challenge.scene} style={style} label={prompt} />
          <div className="geo4-options">
            {question.options.map((option) => {
              const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
              return (
                <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                  {t(`grade4Geometry.measurement.boolLabel.${option}`)}
                </button>
              );
            })}
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
