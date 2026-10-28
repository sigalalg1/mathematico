import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from '../components/MathText';
import { PolygonSceneView } from '../components/geometry/PolygonSceneView';
import { ConceptIntro } from '../components/geometry/ConceptIntro';
import { GeometryLessonFlow, type LessonStep } from '../components/geometry/GeometryLessonFlow';
import { grade4GeometryStyle } from '../geometry/style';
import { buildPolygonScene, buildPolygonVertexPoints, buildRectangleVertices, buildRhombusVertices, buildSquareVertices, buildTrapezoidVertices, buildParallelogramVertices, polygonFamilyKey } from '../geometry/polygonScene';
import { createSeededRandom } from '../utils/seededRandom';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { geo4FamilyActivity } from '../data/games/grade4GeoFamilyData';
import type { Geo4FamilyChallenge } from '../types/geometryGrade4';
import './Grade4GeometryShared.css';

const HUB_PATH = '/grade/4/geometry-foundations';
const style = grade4GeometryStyle;

function polygonAt(sides: number, center: { x: number; y: number }, rotation: number, seedOffset: number) {
  const random = createSeededRandom(10 + seedOffset);
  const points = buildPolygonVertexPoints(center, sides, 55, { rotationDeg: rotation, random });
  return buildPolygonScene(`fam-${sides}-${seedOffset}`, points, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, sides));
}

function FamilyGalleryTryIt({ markTried }: { markTried: () => void }) {
  const { t } = useTranslation();
  const shapes = [
    { sides: 3, pos: { x: 90, y: 100 }, rot: 20 },
    { sides: 4, pos: { x: 230, y: 100 }, rot: 190 },
    { sides: 6, pos: { x: 160, y: 235 }, rot: 10 },
  ];
  const [revealed, setRevealed] = useState<number | null>(null);
  return (
    <div className="geo4-gallery-row">
      {shapes.map((shape, i) => (
        <button
          key={i}
          type="button"
          className="geo4-gallery-item"
          onClick={() => {
            setRevealed(i);
            markTried();
          }}
        >
          <PolygonSceneView scene={polygonAt(shape.sides, shape.pos, shape.rot, i)} style={style} label={`shape-${i}`} />
          <span className="geo4-gallery-caption">{revealed === i ? t(`grade4Geometry.family.name.${polygonFamilyKey(shape.sides)}`) : '?'}</span>
        </button>
      ))}
    </div>
  );
}

function QuadVocabGallery() {
  const { t } = useTranslation();
  const entries: { name: string; points: ReturnType<typeof buildSquareVertices> }[] = [
    { name: 'square', points: buildSquareVertices({ x: 160, y: 160 }, 60, 15) },
    { name: 'rectangle', points: buildRectangleVertices({ x: 160, y: 160 }, 75, 45, 0) },
    { name: 'rhombus', points: buildRhombusVertices({ x: 160, y: 160 }, 75, 40, 20) },
    { name: 'parallelogram', points: buildParallelogramVertices({ x: 160, y: 160 }, 38, 24, 22, 0) },
    { name: 'trapezoid', points: buildTrapezoidVertices({ x: 160, y: 160 }, 35, 70, 45, 0) },
  ];
  return (
    <div className="geo4-gallery-row">
      {entries.map((entry) => (
        <div key={entry.name} className="geo4-gallery-item" style={{ cursor: 'default' }}>
          <PolygonSceneView scene={buildPolygonScene(entry.name, entry.points, ['A', 'B', 'C', 'D'])} style={style} label={entry.name} />
          <span className="geo4-gallery-caption">{t(`grade4Geometry.family.name.${entry.name}`)}</span>
        </div>
      ))}
    </div>
  );
}

function lessonSteps(): LessonStep[] {
  return [
    {
      id: 'polygonFamily',
      render: ({ markTried, tried }) => (
        <ConceptIntro
          termKey="grade4Geometry.concepts.polygonFamily.term"
          definitionKey="grade4Geometry.concepts.polygonFamily.definition"
          diagram={<FamilyGalleryTryIt markTried={markTried} />}
          tryItKey="grade4Geometry.concepts.polygonFamily.tryIt"
          successKey="grade4Geometry.concepts.polygonFamily.success"
          completed={tried}
        />
      ),
    },
    { id: 'quadrilateralFamily', render: () => <ConceptIntro termKey="grade4Geometry.concepts.quadrilateralFamily.term" definitionKey="grade4Geometry.concepts.quadrilateralFamily.definition" diagram={<QuadVocabGallery />} /> },
  ];
}

export function Geo4FamilyPage() {
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
      activity={geo4FamilyActivity}
      titleKey="grade4Geometry.family.gameName"
      promptKey="grade4Geometry.family.prompt.default"
      contextLabel={t('grades.4')}
      backTo={HUB_PATH}
      backLabel={t('grade4GeometryFoundationsPage.title')}
      renderQuestion={(props) => <Geo4FamilyQuestion key={props.question.id} {...props} />}
      hideBuiltinFeedback
      feedbackTiming={{ correct: 900, wrong: 2000 }}
    />
  );
}

function Geo4FamilyQuestion({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<Geo4FamilyChallenge>) {
  const { t } = useTranslation();
  const challenge = question.payload!;
  const answered = phase === 'feedback' || phase === 'retry';
  const locked = phase === 'feedback';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // `promptValues.name` carries a raw family-key (e.g. "pentagon"), not
  // display text — it must be translated through the `family.name.*`
  // namespace before interpolation, or the Hebrew sentence would end up with
  // a literal English key spliced into it.
  const promptValues = challenge.promptValues?.name ? { name: t(`grade4Geometry.family.name.${challenge.promptValues.name}`) } : {};
  const prompt = t(challenge.promptKey, promptValues);

  return (
    <section className="geo4-scene" data-kind={challenge.kind}>
      <p className="geo4-prompt">{prompt}</p>

      {(challenge.kind === 'nameByCount' || challenge.kind === 'countThenName' || challenge.kind === 'orientationMisconception' || challenge.kind === 'quadrilateralVocab') && challenge.scene && (
        <PolygonSceneView scene={challenge.scene} style={style} label={prompt} />
      )}

      {(challenge.kind === 'nameByCount' || challenge.kind === 'quadrilateralVocab') && (
        <div className="geo4-options">
          {question.options.map((option) => {
            const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
            return (
              <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                {t(`grade4Geometry.family.name.${option}`)}
              </button>
            );
          })}
        </div>
      )}

      {challenge.kind === 'countThenName' && (
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
      )}

      {challenge.kind === 'orientationMisconception' && (
        <div className="geo4-options">
          {question.options.map((option) => {
            const stateClass = answered && option === question.answer ? ' is-correct' : answered && option === lastAnswer?.value ? ' is-wrong' : '';
            return (
              <button key={option} type="button" className={`geo4-option${stateClass}`} disabled={locked} onClick={() => submit(option)}>
                {t(`grade4Geometry.family.boolLabel.${option}`)}
              </button>
            );
          })}
        </div>
      )}

      {challenge.kind === 'tapInGallery' && challenge.gallery && (
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

      {challenge.kind === 'selectAllOfFamily' && challenge.gallery && (
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
                <PolygonSceneView scene={item.scene} style={style} label={item.id} />
              </button>
            ))}
          </div>
          <div className="geo4-select-controls">
            <span className="geo4-select-hint">{t('grade4Geometry.family.selectHint', { count: selected.size })}</span>
            <button type="button" className="geo4-confirm-button" disabled={locked || selected.size === 0} onClick={() => submit([...selected].sort().join(','))}>
              {t('grade4Geometry.family.confirmSelection')}
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
