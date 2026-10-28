import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PolygonSceneView } from '../components/geometry/PolygonSceneView';
import { GeoHandle } from '../components/geometry/GeometryPrimitives';
import { ConceptIntro } from '../components/geometry/ConceptIntro';
import { GeometryLessonFlow, type LessonStep } from '../components/geometry/GeometryLessonFlow';
import { grade4GeometryStyle } from '../geometry/style';
import { adjacentSideIndexPairs, buildPolygonScene, buildPolygonVertexPoints, isDiagonalPair, sideVertexIndices } from '../geometry/polygonScene';
import { createSeededRandom } from '../utils/seededRandom';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { geo4RelationsActivity } from '../data/games/grade4GeoRelationsData';
import type { Geo4RelationsChallenge } from '../types/geometryGrade4';
import './Grade4GeometryShared.css';

const HUB_PATH = '/grade/4/geometry-foundations';
const style = grade4GeometryStyle;

function lessonScene(seed: number, sides = 5) {
  const random = createSeededRandom(seed);
  const points = buildPolygonVertexPoints({ x: 160, y: 160 }, sides, 95, { rotationDeg: 15, random });
  return buildPolygonScene(`lesson-${seed}`, points, ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, sides));
}

function AdjacentSidesTryIt({ markTried }: { markTried: () => void }) {
  const scene = lessonScene(2, 5);
  const [selected, setSelected] = useState<number | null>(null);
  const pairs = adjacentSideIndexPairs(scene);
  const focus = 0;
  const adjacentToFocus = new Set(pairs.filter(([a, b]) => a === focus || b === focus).flatMap(([a, b]) => [a, b]).filter((i) => i !== focus));
  return (
    <PolygonSceneView
      scene={scene}
      style={style}
      label="adjacent sides demo"
      highlightedSideIndices={[focus]}
      sideHandles={Array.from({ length: scene.vertices.length }, (_, i) => i)
        .filter((i) => i !== focus)
        .map((i) => ({
          index: i,
          ariaLabel: `side ${i}`,
          selected: selected === i,
          onClick: () => {
            setSelected(i);
            if (adjacentToFocus.has(i)) markTried();
          },
        }))}
    />
  );
}

function DiagonalTryIt({ markTried }: { markTried: () => void }) {
  const scene = lessonScene(3, 5);
  const focus = 0;
  const [drawn, setDrawn] = useState<number | null>(null);
  const candidates = scene.vertices.map((_, i) => i).filter((i) => i !== focus);
  return (
    <PolygonSceneView
      scene={scene}
      style={style}
      label="diagonal demo"
      diagonals={drawn !== null ? [{ id: 'd', a: focus, b: drawn, dashed: true }] : []}
    >
      {candidates.map((j) => (
        <GeoHandle
          key={j}
          point={{ x: (scene.vertices[focus].point.x + scene.vertices[j].point.x) / 2, y: (scene.vertices[focus].point.y + scene.vertices[j].point.y) / 2 }}
          style={style}
          selected={drawn === j}
          ariaLabel={scene.vertices[j].label}
          onClick={() => {
            if (isDiagonalPair(scene, focus, j)) {
              setDrawn(j);
              markTried();
            }
          }}
        />
      ))}
    </PolygonSceneView>
  );
}

function ParallelTryIt() {
  const scene = lessonScene(4, 4);
  return <PolygonSceneView scene={scene} style={style} label="parallel demo" parallelMarks={[{ sideIndex: 0, count: 1 }, { sideIndex: 2, count: 1 }]} />;
}

function PerpendicularTryIt() {
  const scene = lessonScene(5, 4);
  return <PolygonSceneView scene={scene} style={style} label="perpendicular demo" highlightedSideIndices={[0, 1]} />;
}

function lessonSteps(): LessonStep[] {
  return [
    {
      id: 'adjacentSides',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.adjacentSides.term"
          definitionKey="grade4Geometry.concepts.adjacentSides.definition"
          diagram={<AdjacentSidesTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.adjacentSides.tryIt"
          successKey="grade4Geometry.concepts.adjacentSides.success"
          completed={tried}
        />
      ),
    },
    { id: 'oppositeSides', render: () => <ConceptIntro termKey="grade4Geometry.concepts.oppositeSides.term" definitionKey="grade4Geometry.concepts.oppositeSides.definition" diagram={<ParallelTryIt />} /> },
    {
      id: 'diagonal',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.diagonal.term"
          definitionKey="grade4Geometry.concepts.diagonal.definition"
          diagram={<DiagonalTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.diagonal.tryIt"
          successKey="grade4Geometry.concepts.diagonal.success"
          completed={tried}
        />
      ),
    },
    { id: 'parallelLines', render: () => <ConceptIntro termKey="grade4Geometry.concepts.parallelLines.term" definitionKey="grade4Geometry.concepts.parallelLines.definition" diagram={<ParallelTryIt />} /> },
    { id: 'perpendicularLines', render: () => <ConceptIntro termKey="grade4Geometry.concepts.perpendicularLines.term" definitionKey="grade4Geometry.concepts.perpendicularLines.definition" diagram={<PerpendicularTryIt />} /> },
  ];
}

export function Geo4RelationsPage() {
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
      activity={geo4RelationsActivity}
      titleKey="grade4Geometry.relations.gameName"
      promptKey="grade4Geometry.relations.prompt.default"
      contextLabel={t('grades.4')}
      backTo={HUB_PATH}
      backLabel={t('grade4GeometryFoundationsPage.title')}
      renderQuestion={(props) => <Geo4RelationsQuestion key={props.question.id} {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function Geo4RelationsQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<Geo4RelationsChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const locked = phase === 'feedback';
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const promptValues: Record<string, string> =
    challenge.focusVertexIndex !== undefined ? { vertex: challenge.scene.vertices[challenge.focusVertexIndex].label } : {};
  const prompt = t(challenge.promptKey, promptValues);

  return (
    <section className="geo4-scene" data-kind={challenge.kind}>
      <p className="geo4-prompt">{prompt}</p>

      {challenge.kind === 'tapAdjacentSide' && challenge.focusSideIndex !== undefined && (
        <PolygonSceneView
          scene={challenge.scene}
          style={style}
          label={prompt}
          highlightedSideIndices={[challenge.focusSideIndex]}
          sideHandles={Array.from({ length: challenge.scene.vertices.length }, (_, i) => i)
            .filter((i) => i !== challenge.focusSideIndex)
            .map((i) => ({
              index: i,
              ariaLabel: `side ${i}`,
              onClick: () => {
                if (locked) return;
                const [sa, sb] = sideVertexIndices(challenge.scene, i);
                const [fa, fb] = sideVertexIndices(challenge.scene, challenge.focusSideIndex!);
                const sharesVertex = [sa, sb].some((v) => v === fa || v === fb);
                submit(sharesVertex ? 'adjacent' : 'not-adjacent');
              },
            }))}
        />
      )}

      {(challenge.kind === 'constructDiagonal' || challenge.kind === 'selectAllDiagonalsFromVertex') &&
        challenge.focusVertexIndex !== undefined &&
        challenge.candidateSegments && (
          <>
            <PolygonSceneView
              scene={challenge.scene}
              style={style}
              label={prompt}
              diagonals={challenge.candidateSegments
                .filter(([a, b]) => challenge.kind === 'selectAllDiagonalsFromVertex' && selected.has(b) && isDiagonalPair(challenge.scene, a, b))
                .map(([a, b]) => ({ id: `d-${a}-${b}`, a, b, dashed: true }))}
            >
              {challenge.candidateSegments.map(([a, b]) => (
                <GeoHandle
                  key={`${a}-${b}`}
                  point={{ x: (challenge.scene.vertices[a].point.x + challenge.scene.vertices[b].point.x) / 2, y: (challenge.scene.vertices[a].point.y + challenge.scene.vertices[b].point.y) / 2 }}
                  style={style}
                  selected={challenge.kind === 'selectAllDiagonalsFromVertex' && selected.has(b)}
                  ariaLabel={challenge.scene.vertices[b].label}
                  testId={`geo4-candidate-${a}-${b}`}
                  onClick={() => {
                    if (locked) return;
                    if (challenge.kind === 'constructDiagonal') {
                      submit(isDiagonalPair(challenge.scene, a, b) ? 'diagonal' : 'not-diagonal');
                    } else {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(b)) next.delete(b);
                        else next.add(b);
                        return next;
                      });
                    }
                  }}
                />
              ))}
            </PolygonSceneView>
            {challenge.kind === 'selectAllDiagonalsFromVertex' && (
              <div className="geo4-select-controls">
                <span className="geo4-select-hint">{t('grade4Geometry.relations.selectHint', { count: selected.size })}</span>
                <button
                  type="button"
                  className="geo4-confirm-button"
                  disabled={locked || selected.size === 0}
                  onClick={() => submit([...selected].sort((a, b) => a - b).join(','))}
                >
                  {t('grade4Geometry.relations.confirmSelection')}
                </button>
              </div>
            )}
          </>
        )}

      {challenge.kind === 'compareSideVsDiagonal' && challenge.highlightedSegments && (
        <PolygonSceneView scene={challenge.scene} style={style} label={prompt} diagonals={challenge.highlightedSegments.map(([a, b], i) => ({ id: `seg-${i}`, a, b, color: i === 0 ? style.colors.arc[0] : style.colors.handleActive }))}>
          {challenge.highlightedSegments.map(([a, b], i) => (
            <GeoHandle
              key={i}
              point={{ x: (challenge.scene.vertices[a].point.x + challenge.scene.vertices[b].point.x) / 2, y: (challenge.scene.vertices[a].point.y + challenge.scene.vertices[b].point.y) / 2 }}
              style={style}
              ariaLabel={`segment ${i + 1}`}
              onClick={() => !locked && submit(`segment-${i}`)}
            />
          ))}
        </PolygonSceneView>
      )}

      {challenge.kind === 'parallelOrPerpendicular' && challenge.highlightedSegments && (
        <>
          <PolygonSceneView scene={challenge.scene} style={style} label={prompt} diagonals={challenge.highlightedSegments.map(([a, b], i) => ({ id: `rel-${i}`, a, b, color: i === 0 ? style.colors.arc[0] : style.colors.handleActive }))} />
          <div className="geo4-options">
            {question.options.map((option) => {
              const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
              return (
                <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                  {t(`grade4Geometry.relations.relationLabel.${option}`)}
                </button>
              );
            })}
          </div>
        </>
      )}

      {challenge.kind === 'misconceptionDiagonal' && challenge.highlightedSegments && (
        <>
          <PolygonSceneView scene={challenge.scene} style={style} label={prompt} diagonals={challenge.highlightedSegments.map(([a, b], i) => ({ id: `m-${i}`, a, b, color: style.colors.handleActive }))} />
          <div className="geo4-options">
            {question.options.map((option) => {
              const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
              return (
                <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                  {t(`grade4Geometry.relations.boolLabel.${option}`)}
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
