import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AngleVisual, TriangleVisual } from '../components/GeometryVisuals';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import { useSound } from '../audio/useSound';
import { GEOMETRY_ACTIVITY_IDS } from '../data/games/geometryAnglesTrianglesData';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useGeometryGame } from '../hooks/useGeometryGame';
import type { GeometryActivityId, GeometryChallenge, Point } from '../types/geometry';
import { classifyAngle, classifyTriangle, dragAngle, isValidTriangle } from '../utils/geometry';
import './GeometryActivityPage.css';

const TOPIC_PATH = '/grade/3/geometry-angles-triangles';
const ADVANCE_MS = 650;
const ANGLE_TYPE_ORDER = ['acute', 'right', 'obtuse'];

function isActivityId(value: string | undefined): value is GeometryActivityId {
  return GEOMETRY_ACTIVITY_IDS.includes(value as GeometryActivityId);
}

export function GeometryActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  if (!isActivityId(activityId)) return <Navigate to={TOPIC_PATH} replace />;
  return <GeometryActivity activityId={activityId} />;
}

function GeometryActivity({ activityId }: { activityId: GeometryActivityId }) {
  const { t } = useTranslation();
  const { enabled, play, toggle } = useSound();
  const game = useGeometryGame(activityId);
  const [angle, setAngle] = useState(game.challenge.angle ?? 45);
  const [points, setPoints] = useState(game.challenge.points);
  const [selected, setSelected] = useState<string | null>(null);

  useGameSessionTracking(activityId, {
    total: game.total,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setAngle(game.challenge.angle ?? 45);
    setPoints(game.challenge.points);
    setSelected(null);
  }

  useEffect(() => {
    if (game.status !== 'correct') return undefined;
    play('hit');
    const timer = window.setTimeout(game.next, ADVANCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  function submit(answer: string) {
    if (game.status === 'correct') return;
    setSelected(answer);
    game.submit(answer);
    play(answer === game.challenge.correctAnswer ? 'select' : 'miss');
  }

  const promptType = game.challenge.interaction === 'select-sides'
    ? t(`geometry.sideTypes.${game.challenge.correctAnswer}`)
    : game.challenge.interaction === 'select-triangle-angle'
      ? t(`geometry.triangleAngleTypes.${game.challenge.correctAnswer}`)
      : t(`geometry.angleTypes.${game.challenge.targetAngle ?? 'right'}`);

  if (game.completed) {
    return (
      <PageLayout title={t(`geometry.activities.${activityId}.name`)} backTo={TOPIC_PATH} backLabel={t('geometry.unitName')} variant="game">
        <div className="geo-game">
          <section className="geo-finale">
            <div className="geo-trophy" aria-hidden="true">△</div>
            <h2>{t('geometry.completion.title')}</h2>
            <p>{t('geometry.completion.body', { count: game.total })}</p>
            <div className="geo-actions">
              <button className="btn geo-primary" type="button" onClick={game.retry}>{t('geometry.actions.playAgain')}</button>
              <Link className="btn geo-secondary" to={TOPIC_PATH}>{t('geometry.actions.back')}</Link>
            </div>
          </section>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t(`geometry.activities.${activityId}.name`)} backTo={TOPIC_PATH} backLabel={t('geometry.unitName')} variant="game">
      <div className="geo-game">
        <section className={`geo-scene geo-scene-${activityId} geo-status-${game.status}`}>
          <GeometryScenery />
          <header className="geo-hud">
            <GeometryProgress current={game.index + 1} total={game.total} />
            <SoundToggle enabled={enabled} onToggle={toggle} />
          </header>
          <div className="geo-prompt">{t(game.challenge.promptKey, { type: promptType })}</div>
          <div className="geo-play">
            <ChallengeScene
              challenge={game.challenge}
              angle={angle}
              points={points}
              selected={selected}
              status={game.status}
              onAngle={setAngle}
              onPoints={setPoints}
              onSubmit={submit}
            />
          </div>
          {game.status !== 'unanswered' && (
            <div className={`geo-feedback geo-feedback-${game.status}`} role="status">
              {t(game.status === 'correct' ? 'geometry.feedback.correct' : 'geometry.feedback.retry')}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

interface SceneProps {
  challenge: GeometryChallenge;
  angle: number;
  points?: [Point, Point, Point];
  selected: string | null;
  status: 'unanswered' | 'correct' | 'incorrect';
  onAngle: (angle: number) => void;
  onPoints: (points: [Point, Point, Point]) => void;
  onSubmit: (answer: string) => void;
}

function ChallengeScene({ challenge, angle, points, selected, status, onAngle, onPoints, onSubmit }: SceneProps) {
  const { t } = useTranslation();
  const angleLabel = (value: number) => t('geometry.a11y.angle', { degrees: Math.round(value) });
  const interactiveAngle = challenge.interaction === 'explore-angle' || challenge.interaction === 'build-angle';

  if (interactiveAngle) {
    const actualType = classifyAngle(angle);
    return (
      <div className="geo-workbench">
        <AngleVisual
          angle={angle}
          rotation={challenge.rotation}
          interactive
          label={angleLabel(angle)}
          onPointer={(pointer) => onAngle(Math.max(5, Math.min(175, dragAngle({ x: 100, y: 100 }, pointer, challenge.rotation))))}
        />
        <div className="geo-live" dir="ltr">{Math.round(angle)}° · {t(`geometry.angleTypes.${actualType}`)}</div>
        <div className="geo-concept">{t(challenge.interaction === 'explore-angle' ? 'geometry.concepts.angleParts' : 'geometry.concepts.dragArm')}</div>
        <button className="geo-check" type="button" onClick={() => onSubmit(challenge.interaction === 'explore-angle' ? 'done' : actualType)}>
          {t(challenge.interaction === 'explore-angle' ? 'geometry.actions.continue' : 'geometry.actions.check')}
        </button>
      </div>
    );
  }

  if (challenge.interaction === 'select-angle') {
    return (
      <div className="geo-workbench">
        <AngleVisual angle={challenge.angle!} rotation={challenge.rotation} label={angleLabel(challenge.angle!)} />
        <ChoiceButtons values={ANGLE_TYPE_ORDER} selected={selected} status={status} onSubmit={onSubmit} translationPrefix="geometry.angleTypes" />
      </div>
    );
  }

  if (challenge.interaction === 'hunt-angle' || challenge.interaction === 'find-corners') {
    return (
      <div className={`geo-angle-field ${challenge.interaction === 'find-corners' ? 'is-scene' : ''}`}>
        {challenge.candidates!.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            className={`geo-angle-target${selected === candidate.answer ? ' is-selected' : ''}`}
            onClick={() => onSubmit(candidate.answer)}
            aria-label={t('geometry.a11y.selectAngle', { degrees: candidate.angle })}
          >
            <AngleVisual angle={candidate.angle!} rotation={candidate.rotation} label={angleLabel(candidate.angle!)} />
          </button>
        ))}
      </div>
    );
  }

  if (challenge.interaction === 'explore-triangle') {
    return (
      <div className="geo-workbench">
        <TriangleVisual points={points!} label={t('geometry.a11y.triangle')} />
        <div className="geo-concept">{t('geometry.concepts.triangleParts')}</div>
        <button className="geo-check" type="button" onClick={() => onSubmit('done')}>{t('geometry.actions.continue')}</button>
      </div>
    );
  }

  if (challenge.interaction === 'triangle-lab') {
    const classification = classifyTriangle(points!);
    return (
      <div className="geo-lab">
        <TriangleVisual
          points={points!}
          label={t('geometry.a11y.triangle')}
          interactive
          onVertexPointer={(index, point) => {
            const candidate = points!.map((current, currentIndex) => currentIndex === index ? point : current) as [Point, Point, Point];
            if (isValidTriangle(candidate)) onPoints(candidate);
          }}
        />
        <div className="geo-dual">
          <span>{t(`geometry.sideTypes.${classification.sides}`)}</span>
          <strong>+</strong>
          <span>{t(`geometry.triangleAngleTypes.${classification.angles}`)}</span>
        </div>
        <button className="geo-check" type="button" onClick={() => onSubmit(challenge.correctAnswer)}>{t('geometry.actions.check')}</button>
      </div>
    );
  }

  if (challenge.interaction === 'rotation') {
    const sideQuestion = ['equilateral', 'isosceles', 'scalene'].includes(challenge.correctAnswer);
    return (
      <div className="geo-workbench">
        <TriangleVisual points={points!} label={t('geometry.a11y.triangle')} showMeasures={false} />
        <ChoiceButtons
          values={sideQuestion ? ['equilateral', 'isosceles', 'scalene'] : ['acute', 'right', 'obtuse']}
          selected={selected}
          status={status}
          onSubmit={onSubmit}
          translationPrefix={sideQuestion ? 'geometry.sideTypes' : 'geometry.triangleAngleTypes'}
        />
      </div>
    );
  }

  return (
    <div className="geo-triangle-challenge">
      {challenge.riddleKeys && <div className="geo-riddle">{challenge.riddleKeys.map((key) => <span key={key}>{t(key)}</span>)}</div>}
      <div className="geo-triangle-dock">
        {challenge.candidates!.map((candidate) => (
          <button key={candidate.id} type="button" className={`geo-triangle-choice${selected === candidate.answer ? ' is-selected' : ''}`} onClick={() => onSubmit(candidate.answer)}>
            <TriangleVisual points={candidate.points!} label={t('geometry.a11y.triangle')} showMeasures={challenge.interaction !== 'rotation'} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceButtons({ values, selected, status, onSubmit, translationPrefix }: { values: string[]; selected: string | null; status: string; onSubmit: (value: string) => void; translationPrefix: string }) {
  const { t } = useTranslation();
  return <div className="geo-choice-dock">{values.map((value) => <button key={value} type="button" className={`geo-choice${selected === value ? ' is-selected' : ''}`} disabled={status === 'correct'} onClick={() => onSubmit(value)}>{t(`${translationPrefix}.${value}`)}</button>)}</div>;
}

function GeometryProgress({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  return <div className="geo-progress" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={t('geometry.progress', { current, total })}>{Array.from({ length: total }, (_, index) => <span key={index} className={`geo-pip${index + 1 < current ? ' is-done' : ''}${index + 1 === current ? ' is-active' : ''}`} />)}</div>;
}

function GeometryScenery() {
  return <div className="geo-scenery" aria-hidden="true"><span className="geo-sun" /><span className="geo-cloud geo-cloud-1" /><span className="geo-cloud geo-cloud-2" /><span className="geo-mountain geo-mountain-1" /><span className="geo-mountain geo-mountain-2" /></div>;
}
