import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { GeometryStage } from '../components/geometry/GeometryStage';
import { GeoHandle, GeoPoint, GeoRay, GeoSegment } from '../components/geometry/GeometryPrimitives';
import { PolygonSceneView } from '../components/geometry/PolygonSceneView';
import { ConceptIntro } from '../components/geometry/ConceptIntro';
import { GeometryLessonFlow, type LessonStep } from '../components/geometry/GeometryLessonFlow';
import { grade4GeometryStyle } from '../geometry/style';
import { buildPolygonScene, buildPolygonVertexPoints, sideMidpoint } from '../geometry/polygonScene';
import { createSeededRandom } from '../utils/seededRandom';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { geo4PointsActivity } from '../data/games/grade4GeoPointsData';
import type { Geo4PointsChallenge } from '../types/geometryGrade4';
import './Grade4GeometryShared.css';

const HUB_PATH = '/grade/4/geometry-foundations';
const style = grade4GeometryStyle;

function LessonPolygon() {
  const random = createSeededRandom(1);
  const points = buildPolygonVertexPoints({ x: 160, y: 160 }, 5, 95, { rotationDeg: 20, random });
  return buildPolygonScene('lesson-poly', points, ['A', 'B', 'C', 'D', 'E']);
}

function VertexTryIt({ markTried }: { markTried: () => void }) {
  const scene = LessonPolygon();
  const [highlighted, setHighlighted] = useState(0);
  return (
    <PolygonSceneView
      scene={scene}
      style={style}
      label="vertex demo"
      vertexHandles={scene.vertices.map((v, i) => ({
        index: i,
        ariaLabel: v.label,
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

function SideTryIt({ markTried }: { markTried: () => void }) {
  const scene = LessonPolygon();
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <PolygonSceneView
      scene={scene}
      style={style}
      label="side demo"
      sideHandles={Array.from({ length: scene.vertices.length }, (_, i) => ({
        index: i,
        ariaLabel: `side ${i}`,
        selected: selected === i,
        onClick: () => {
          setSelected(i);
          markTried();
        },
      }))}
    />
  );
}

function PolygonTryIt() {
  const scene = LessonPolygon();
  return <PolygonSceneView scene={scene} style={style} label="polygon demo" />;
}

function PointTryIt() {
  return (
    <GeometryStage style={style} label="point demo">
      <GeoPoint point={{ x: 160, y: 160 }} label="A" style={style} emphasis="vertex" />
    </GeometryStage>
  );
}

function SegmentTryIt() {
  const a = { x: 100, y: 160 };
  const b = { x: 220, y: 160 };
  return (
    <GeometryStage style={style} label="segment demo">
      <GeoSegment a={a} b={b} style={style} />
      <GeoPoint point={a} label="A" style={style} emphasis="vertex" />
      <GeoPoint point={b} label="B" style={style} emphasis="vertex" />
    </GeometryStage>
  );
}

function LineTryIt() {
  // A "line" never ends — drawn edge-to-edge of the stage, with small arrow
  // strokes at both ends suggesting it continues beyond what is shown.
  const a = { x: 20, y: 240 };
  const b = { x: 300, y: 80 };
  return (
    <GeometryStage style={style} label="line demo">
      <GeoSegment a={a} b={b} style={style} />
      <GeoPoint point={{ x: 160, y: 160 }} label="A" style={style} emphasis="point" labelAngleDeg={200} />
    </GeometryStage>
  );
}

function RayTryIt() {
  const vertex = { x: 90, y: 230 };
  const through = { x: 260, y: 90 };
  return (
    <GeometryStage style={style} label="ray demo">
      <GeoRay vertex={vertex} through={through} style={style} />
      <GeoPoint point={vertex} label="A" style={style} emphasis="vertex" />
    </GeometryStage>
  );
}

function lessonSteps(): LessonStep[] {
  return [
    { id: 'point', render: () => <ConceptIntro termKey="grade4Geometry.concepts.point.term" definitionKey="grade4Geometry.concepts.point.definition" diagram={<PointTryIt />} /> },
    { id: 'segment', render: () => <ConceptIntro termKey="grade4Geometry.concepts.segment.term" definitionKey="grade4Geometry.concepts.segment.definition" diagram={<SegmentTryIt />} /> },
    { id: 'line', render: () => <ConceptIntro termKey="grade4Geometry.concepts.line.term" definitionKey="grade4Geometry.concepts.line.definition" diagram={<LineTryIt />} /> },
    { id: 'ray', render: () => <ConceptIntro termKey="grade4Geometry.concepts.ray.term" definitionKey="grade4Geometry.concepts.ray.definition" diagram={<RayTryIt />} /> },
    {
      id: 'vertex',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.vertex.term"
          definitionKey="grade4Geometry.concepts.vertex.definition"
          diagram={<VertexTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.vertex.tryIt"
          successKey="grade4Geometry.concepts.vertex.success"
          completed={tried}
        />
      ),
    },
    {
      id: 'side',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.side.term"
          definitionKey="grade4Geometry.concepts.side.definition"
          diagram={<SideTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.side.tryIt"
          successKey="grade4Geometry.concepts.side.success"
          completed={tried}
        />
      ),
    },
    { id: 'polygon', render: () => <ConceptIntro termKey="grade4Geometry.concepts.polygon.term" definitionKey="grade4Geometry.concepts.polygon.definition" diagram={<PolygonTryIt />} /> },
  ];
}

export function Geo4PointsSegmentsPage() {
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
      activity={geo4PointsActivity}
      titleKey="grade4Geometry.points.gameName"
      promptKey="grade4Geometry.points.prompt.default"
      contextLabel={t('grades.4')}
      backTo={HUB_PATH}
      backLabel={t('grade4GeometryFoundationsPage.title')}
      renderQuestion={(props) => <Geo4PointsQuestion key={props.question.id} {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function Geo4PointsQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<Geo4PointsChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const prompt = t(challenge.promptKey, challenge.promptValues ?? {});
  const locked = phase === 'feedback';

  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <section className="geo4-scene" data-kind={challenge.kind}>
      <p className="geo4-prompt">{prompt}</p>

      {challenge.kind === 'tapVertex' && challenge.scene && (
        <PolygonSceneView
          scene={challenge.scene}
          style={style}
          label={prompt}
          vertexHandles={challenge.scene.vertices.map((v, i) => ({
            index: i,
            ariaLabel: v.label,
            onClick: () => !locked && submit('vertex'),
          }))}
        >
          {challenge.decoySideIndex !== undefined && (
            <GeoHandle
              point={sideMidpoint(challenge.scene, challenge.decoySideIndex)}
              style={style}
              ariaLabel={t('grade4Geometry.points.decoyLabel')}
              onClick={() => !locked && submit('decoy')}
              testId="geo4-decoy-handle"
            />
          )}
        </PolygonSceneView>
      )}

      {challenge.kind === 'tapSide' && challenge.scene && (
        <PolygonSceneView
          scene={challenge.scene}
          style={style}
          label={prompt}
          sideHandles={Array.from({ length: challenge.scene.vertices.length }, (_, i) => ({
            index: i,
            ariaLabel: `side ${i + 1}`,
            onClick: () => !locked && submit('side'),
          }))}
        />
      )}

      {(challenge.kind === 'selectAllVertices' || challenge.kind === 'selectAllSides') && challenge.scene && (
        <>
          <PolygonSceneView
            scene={challenge.scene}
            style={style}
            label={prompt}
            vertexHandles={
              challenge.kind === 'selectAllVertices'
                ? challenge.scene.vertices.map((v, i) => ({
                    index: i,
                    ariaLabel: v.label,
                    selected: selected.has(v.id),
                    onClick: () =>
                      !locked &&
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(v.id)) next.delete(v.id);
                        else next.add(v.id);
                        return next;
                      }),
                  }))
                : []
            }
            sideHandles={
              challenge.kind === 'selectAllSides'
                ? Array.from({ length: challenge.scene.vertices.length }, (_, i) => ({
                    index: i,
                    ariaLabel: `side ${i + 1}`,
                    selected: selected.has(`s${i}`),
                    onClick: () =>
                      !locked &&
                      setSelected((prev) => {
                        const id = `s${i}`;
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      }),
                  }))
                : []
            }
          />
          <div className="geo4-select-controls">
            <span className="geo4-select-hint">{t('grade4Geometry.points.selectHint', { count: selected.size })}</span>
            <button
              type="button"
              className="geo4-confirm-button"
              data-testid="geo4-confirm-selection"
              disabled={locked || selected.size === 0}
              onClick={() => submit([...selected].sort().join(','))}
            >
              {t('grade4Geometry.points.confirmSelection')}
            </button>
          </div>
        </>
      )}

      {challenge.kind === 'isPolygon' && challenge.scene && (
        <>
          <PolygonSceneView scene={challenge.scene} style={style} label={prompt} />
          <div className="geo4-options">
            {question.options.map((option) => {
              const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
              return (
                <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                  {t(`grade4Geometry.points.options.${option}`)}
                </button>
              );
            })}
          </div>
        </>
      )}

      {challenge.kind === 'countSides' && challenge.scene && (
        <>
          <PolygonSceneView scene={challenge.scene} style={style} label={prompt} />
          <div className="geo4-options">
            {question.options.map((option) => {
              const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
              return (
                <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                  <MathText>{option}</MathText>
                </button>
              );
            })}
          </div>
        </>
      )}

      {challenge.kind === 'galleryPick' && challenge.gallery && (
        <div className="geo4-gallery-row">
          {challenge.gallery.map((item) => {
            const stateClass = answered && item.id === question.answer ? ' is-correct' : answered && item.id === lastAnswer?.value ? ' is-wrong' : '';
            return (
              <button key={item.id} type="button" className={`geo4-gallery-item${stateClass}`} disabled={locked} onClick={() => submit(item.id)}>
                <PolygonSceneView scene={item.scene} style={style} label={item.id} />
              </button>
            );
          })}
        </div>
      )}

      {answered && lastAnswer && (
        <p className={`geo4-feedback ${lastAnswer.isCorrect ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
          {t(lastAnswer.isCorrect ? 'training.feedback.correct' : challenge.feedbackKey)}
        </p>
      )}
    </section>
  );
}
