import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { useCoordinateMissionGame, COORDINATE_MISSION_TOTAL_COUNT, recommendGameFromMistakes } from '../hooks/useCoordinateMissionGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import type { GridTargetId } from '../types/vocabularyQuiz';
import type { Point } from '../types/coordinateMission';
import '../components/quiz/QuizShared.css';
import './CoordinateMissionPage.css';

const GAME_ID = 'coordinateMission';
const DIGITS_ONLY = /^-?\d*$/;
const VALID_INT = /^-?\d+$/;

export function CoordinateMissionPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useCoordinateMissionGame();
  const [xInput, setXInput] = useState('');
  const [yInput, setYInput] = useState('');
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: COORDINATE_MISSION_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setXInput('');
    setYInput('');
  }

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('coordinateMission.feedback.correctMessages', { returnObjects: true }) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the sound, not derived state
      setCorrectMessage(messages[Math.floor(Math.random() * messages.length)]);
    } else if (game.status === 'incorrect') {
      play('miss');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  useEffect(() => {
    if (game.status !== 'correct') return;
    const timer = window.setTimeout(() => game.next(), 750);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  const challenge = game.challenge;
  const answered = game.status !== 'unanswered';

  function handleAxisSelect(id: GridTargetId) {
    if (game.status === 'correct') return;
    game.submit({ kind: 'axis', value: id });
  }

  function handleGridClick(point: Point) {
    if (game.status === 'correct' || (challenge.kind !== 'placePoint' && challenge.kind !== 'completeRectangle')) return;
    game.submit({ kind: 'point', value: point });
  }

  function handleQuadrantClick(quadrant: 1 | 2 | 3 | 4) {
    if (game.status === 'correct' || challenge.kind !== 'quadrant') return;
    game.submit({ kind: 'quadrant', value: quadrant });
  }

  function handleChoice(value: string) {
    if (game.status === 'correct') return;
    game.submit({ kind: 'choice', value: value as never });
  }

  function handleCoordsSubmit() {
    if (!VALID_INT.test(xInput) || !VALID_INT.test(yInput) || game.status === 'correct') return;
    game.submit({ kind: 'coords', x: Number(xInput), y: Number(yInput) });
  }

  function handleSegmentSubmit() {
    if (!VALID_INT.test(xInput) || game.status === 'correct') return;
    game.submit({ kind: 'number', value: Number(xInput) });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    if (challenge.kind === 'readCoordinate') handleCoordsSubmit();
    if (challenge.kind === 'segment') handleSegmentSubmit();
  }

  const rectKnown = challenge.kind === 'completeRectangle' && challenge.rectangleVertices ? challenge.rectangleVertices.slice(0, 3) : [];

  return (
    <PageLayout
      title={t('coordinateMission.gameName')}
      backTo="/grade/7/coordinate-system"
      backLabel={t('coordinateSystemPage.title')}
    >
      {game.completed ? (
        <CoordinateMissionCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} mistakeIds={game.mistakes.map((m) => m.questionId)} onRetry={game.retry} />
      ) : (
        <div className="coordinate-mission">
          <div className="coordinate-mission-top">
            <QuizProgress current={game.index + 1} total={game.total} labelKey="coordinateMission.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <p className="coordinate-mission-prompt">{t(challenge.promptKey)}</p>

          {challenge.pair && (
            <MathText className="coordinate-mission-pair">
              ({challenge.pair.x}, {challenge.pair.y})
            </MathText>
          )}

          <CoordinateGrid
            size="lg"
            point={challenge.kind === 'readCoordinate' || challenge.kind === 'quadrant' || challenge.kind === 'detectMistake' ? (challenge.point ?? null) : null}
            attemptMarker={challenge.kind === 'detectMistake' ? (challenge.wrongAnswer ?? null) : challenge.kind === 'placePoint' || challenge.kind === 'completeRectangle' ? (answered && game.status === 'incorrect' && game.lastAnswer?.kind === 'point' ? game.lastAnswer.value : null) : null}
            targetMarker={(challenge.kind === 'placePoint' || challenge.kind === 'completeRectangle') && answered ? (challenge.correctPoint ?? null) : null}
            quadrant={challenge.kind === 'quadrant' && answered ? (challenge.correctQuadrant ?? null) : null}
            vertexLabels={rectKnown.map((point, i) => ({ point, label: ['A', 'B', 'C'][i] }))}
            segments={
              challenge.kind === 'segment' && challenge.segmentA && challenge.segmentB
                ? [{ from: challenge.segmentA, to: challenge.segmentB, variant: answered ? (game.status === 'correct' ? 'correct' : 'incorrect') : 'default' }]
                : challenge.kind === 'completeRectangle'
                  ? [
                      { from: rectKnown[0], to: rectKnown[1] },
                      { from: rectKnown[1], to: rectKnown[2] },
                    ]
                  : []
            }
            interactiveTargets={challenge.kind === 'identifyAxis' ? ['xAxis', 'yAxis', 'origin'] : undefined}
            targetLabels={
              challenge.kind === 'identifyAxis'
                ? { xAxis: t('vocabulary.targets.xAxis'), yAxis: t('vocabulary.targets.yAxis'), origin: t('vocabulary.targets.origin') }
                : undefined
            }
            correctTargetId={challenge.kind === 'identifyAxis' ? challenge.correctAxis : undefined}
            selectedTargetId={challenge.kind === 'identifyAxis' && game.lastAnswer?.kind === 'axis' ? game.lastAnswer.value : null}
            status={challenge.kind === 'identifyAxis' ? game.status : 'unanswered'}
            onSelectTarget={challenge.kind === 'identifyAxis' ? handleAxisSelect : undefined}
            onGridClick={challenge.kind === 'placePoint' || challenge.kind === 'completeRectangle' ? handleGridClick : undefined}
            onQuadrantClick={challenge.kind === 'quadrant' ? handleQuadrantClick : undefined}
          />

          {(challenge.kind === 'axisOrQuadrant' || challenge.kind === 'detectMistake') && challenge.choiceOptions && (
            <div className="question-options coordinate-mission-choices">
              {challenge.choiceOptions.map((option) => (
                <button
                  key={String(option.id)}
                  type="button"
                  className={`question-option ${answered && option.id === challenge.correctChoice ? 'is-correct' : ''} ${
                    answered && game.lastAnswer?.kind === 'choice' && game.lastAnswer.value === option.id && option.id !== challenge.correctChoice ? 'is-incorrect' : ''
                  }`}
                  onClick={() => handleChoice(String(option.id))}
                  disabled={game.status === 'correct'}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          )}

          {(challenge.kind === 'readCoordinate' || challenge.kind === 'segment') && (
            <div className="coordinate-mission-input-row" dir="ltr">
              <label className="coordinate-mission-field">
                <span>{t('hitTheTarget.inputs.x')}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={xInput}
                  onChange={(event) => DIGITS_ONLY.test(event.target.value) && setXInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={game.status === 'correct'}
                />
              </label>
              {challenge.kind === 'readCoordinate' && (
                <label className="coordinate-mission-field">
                  <span>{t('hitTheTarget.inputs.y')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={yInput}
                    onChange={(event) => DIGITS_ONLY.test(event.target.value) && setYInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={game.status === 'correct'}
                  />
                </label>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={challenge.kind === 'readCoordinate' ? handleCoordsSubmit : handleSegmentSubmit}
                disabled={game.status === 'correct' || xInput.length === 0 || (challenge.kind === 'readCoordinate' && yInput.length === 0)}
              >
                {t('hitTheTarget.actions.fire')}
              </button>
            </div>
          )}

          {game.status === 'correct' && <p className="coordinate-mission-feedback feedback-correct-text">{correctMessage}</p>}
          {game.status === 'incorrect' && (
            <p className="coordinate-mission-feedback feedback-hint-text">{t('coordinateMission.feedback.incorrectHint')}</p>
          )}
        </div>
      )}
    </PageLayout>
  );
}

interface CoordinateMissionCompletionProps {
  total: number;
  firstTryCount: number;
  mistakeIds: string[];
  onRetry: () => void;
}

function CoordinateMissionCompletion({ total, firstTryCount, mistakeIds, onRetry }: CoordinateMissionCompletionProps) {
  const { t } = useTranslation();
  const recommendation = recommendGameFromMistakes(mistakeIds);

  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        🚩
      </span>
      <h2 className="quiz-completion-title">{t('coordinateMission.completion.title')}</h2>
      <p className="quiz-completion-score">{t('coordinateMission.completion.summary', { total })}</p>
      <p className="coordinate-mission-completion-detail">{t('coordinateMission.completion.firstTry', { count: firstTryCount })}</p>
      <p className="coordinate-mission-recommendation">
        {recommendation ? t('coordinateMission.completion.recommendation', { game: t(recommendation.nameKey) }) : t('coordinateMission.completion.allGood')}
      </p>
      <div className="coordinate-mission-completion-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('launchSpaceship.actions.playAgain')}
        </button>
        <Link className="btn btn-secondary" to="/grade/7/coordinate-system">
          {t('launchSpaceship.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}
