import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { useLaunchSpaceshipGame, LAUNCH_SPACESHIP_TOTAL_COUNT, type GuidedHint } from '../hooks/useLaunchSpaceshipGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { launchSpaceshipStages } from '../data/games/launchSpaceshipStages';
import type { MistakeType, TargetPoint } from '../types/hitTheTarget';
import '../components/quiz/QuizShared.css';
import './LaunchSpaceshipPage.css';

const GAME_ID = 'launchTheSpaceship';

export function LaunchSpaceshipPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useLaunchSpaceshipGame();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: LAUNCH_SPACESHIP_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  // Phase/flight-status transitions drive sound + the short "arrived" flavor text.
  const arrived = game.phase === 'arrived' || game.flightStatus === 'landedCorrect';
  useEffect(() => {
    if (game.phase === 'y') {
      play('phaseChange');
    } else if (arrived) {
      play('hit');
      const messages = t('launchSpaceship.feedback.correctMessages', { returnObjects: true }) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the arrival sound, not derived state
      setCorrectMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase, arrived]);

  useEffect(() => {
    if (game.flightStatus === 'flying') play('fire');
    else if (game.flightStatus === 'landedIncorrect') play('miss');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.flightStatus]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  useEffect(() => {
    if (!game.justEnteredStage || game.stageIndex === 0) return;
    play('stageComplete');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the chime, not derived state
    setBannerVisible(true);
    const timer = window.setTimeout(() => setBannerVisible(false), 2200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.justEnteredStage, game.stageIndex]);

  useEffect(() => {
    if (!arrived) return;
    const timer = window.setTimeout(() => game.advance(), 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived, game.destinationNumber]);

  const stage = launchSpaceshipStages[game.stageIndex];
  const hintMessage = getGuidedHintMessage(t, game.hint, game.destination);
  const mistakeMessage = game.flightStatus === 'landedIncorrect' ? getDirectMistakeMessage(t, game.mistakeType, game.destination) : null;

  const showRevealMarkers = game.mode === 'direct' && game.flightStatus === 'landedIncorrect';
  const canClickGrid = game.mode === 'direct' && game.flightStatus !== 'flying' && game.flightStatus !== 'landedCorrect';

  return (
    <PageLayout
      title={t('games.launchTheSpaceship.name')}
      context={t('grades.7')} backTo="/grade/7/coordinate-system"
      backLabel={t('coordinateSystemPage.title')}
    >
      {game.completed ? (
        <LaunchSpaceshipCompletion
          total={LAUNCH_SPACESHIP_TOTAL_COUNT}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      ) : (
        <div className="launch-spaceship">
          <div className="launch-spaceship-top">
            <QuizProgress current={game.destinationNumber} total={LAUNCH_SPACESHIP_TOTAL_COUNT} labelKey="launchSpaceship.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <span className="launch-spaceship-stage">{t(stage.nameKey)}</span>

          {bannerVisible && <div className="launch-spaceship-banner">{t(stage.introKey)}</div>}

          <div className="launch-spaceship-destination">
            <span>{t('launchSpaceship.destinationLabel')}</span>
            <MathText className="launch-spaceship-pair">
              (
              <span className={game.mode === 'guided' && game.phase === 'x' ? 'pair-emphasis' : undefined}>
                {game.destination.x}
              </span>
              {', '}
              <span className={game.mode === 'guided' && game.phase === 'y' ? 'pair-emphasis' : undefined}>
                {game.destination.y}
              </span>
              )
            </MathText>
          </div>

          {game.mode === 'guided' && game.phase === 'y' && <p className="launch-spaceship-phase-message">{t('launchSpaceship.feedback.xDone')}</p>}

          <CoordinateGrid
            size="lg"
            ship={game.shipPosition}
            trail={game.trail}
            shipArrived={arrived}
            shipArrivedSeed={game.destinationNumber}
            targetMarker={showRevealMarkers ? game.destination : null}
            attemptMarker={game.landingPoint}
            onGridClick={canClickGrid ? game.selectPoint : undefined}
          />

          {arrived && <p className="launch-spaceship-feedback feedback-correct-text">{correctMessage}</p>}
          {!arrived && hintMessage && <p className="launch-spaceship-feedback feedback-hint-text">{hintMessage}</p>}
          {!arrived && mistakeMessage && <p className="launch-spaceship-feedback feedback-hint-text">{mistakeMessage}</p>}

          {game.mode === 'guided' && !arrived && (
            <div className="launch-spaceship-controls" dir="ltr">
              {game.phase === 'x' ? (
                <>
                  <button type="button" className="question-option question-option-glyph" onClick={() => fireMove(play, () => game.moveX(-1))}>
                    {t('exercises.meetTheAxes.options.left')}
                  </button>
                  <button type="button" className="question-option question-option-glyph" onClick={() => fireMove(play, () => game.moveX(1))}>
                    {t('exercises.meetTheAxes.options.right')}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="question-option question-option-glyph" onClick={() => fireMove(play, () => game.moveY(1))}>
                    {t('exercises.meetTheAxes.options.up')}
                  </button>
                  <button type="button" className="question-option question-option-glyph" onClick={() => fireMove(play, () => game.moveY(-1))}>
                    {t('exercises.meetTheAxes.options.down')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function fireMove(play: (name: 'move') => void, action: () => void) {
  play('move');
  action();
}

function getGuidedHintMessage(
  t: (key: string, options?: Record<string, unknown>) => string,
  hint: GuidedHint | null,
  destination: TargetPoint,
): string | null {
  if (!hint) return null;
  const axis = hint.axis === 'x' ? 'X' : 'Y';
  const value = hint.axis === 'x' ? destination.x : destination.y;
  const sign = value < 0 ? t('launchSpaceship.words.negative') : t('launchSpaceship.words.positive');
  const direction = t(`launchSpaceship.words.${hint.direction}`);
  return t('launchSpaceship.hints.direction', { axis, sign, direction });
}

function getDirectMistakeMessage(
  t: (key: string, options?: Record<string, unknown>) => string,
  mistakeType: MistakeType | null,
  destination: TargetPoint,
): string | null {
  if (!mistakeType) return null;

  if (mistakeType === 'xSign') {
    const direction = destination.x < 0 ? t('launchSpaceship.words.leftward') : t('launchSpaceship.words.rightward');
    const sign = destination.x < 0 ? t('launchSpaceship.words.negative') : t('launchSpaceship.words.positive');
    return t('launchSpaceship.feedback.directMistake', { axis: 'X', sign, direction });
  }
  if (mistakeType === 'ySign') {
    const direction = destination.y < 0 ? t('launchSpaceship.words.downward') : t('launchSpaceship.words.upward');
    const sign = destination.y < 0 ? t('launchSpaceship.words.negative') : t('launchSpaceship.words.positive');
    return t('launchSpaceship.feedback.directMistake', { axis: 'Y', sign, direction });
  }
  if (mistakeType === 'swapped') return t('launchSpaceship.feedback.swapped');
  return t('launchSpaceship.feedback.other');
}

interface LaunchSpaceshipCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function LaunchSpaceshipCompletion({ total, firstTryCount, onRetry }: LaunchSpaceshipCompletionProps) {
  const { t } = useTranslation();

  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        🚀
      </span>
      <h2 className="quiz-completion-title">{t('launchSpaceship.completion.title')}</h2>
      <p className="quiz-completion-score">{t('launchSpaceship.completion.summary', { total })}</p>
      <p className="launch-spaceship-completion-detail">{t('launchSpaceship.completion.firstTry', { count: firstTryCount })}</p>
      <div className="launch-spaceship-completion-actions">
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
