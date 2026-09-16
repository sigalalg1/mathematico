import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { NumberLine, type NumberLineRegion, type NumberLineSpan } from '../components/NumberLine';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { SignedCompletion } from '../components/SignedCompletion';
import {
  NUMBER_LINE_PLACE_TOTAL_COUNT,
  useNumberLinePlaceGame,
} from '../hooks/useNumberLinePlaceGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { classifyPlacement, placementCount, tickValues } from '../data/games/numberLinePlaceData';
import { formatSigned } from '../utils/signedNumbers';
import './SignedNumbersShared.css';

const GAME_ID = 'numberLinePlace';
const SIGNED_NUMBERS_PATH = '/grade/7/signed-numbers';

const pointId = (value: number) => `tick-${value}`;

export function NumberLinePlacePage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useNumberLinePlaceGame();
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: NUMBER_LINE_PLACE_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('numberLinePlace.feedback.correctMessages', { returnObjects: true }) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the sound, not derived state
      setCorrectMessage(messages[Math.floor(Math.random() * messages.length)]);
    } else if (game.status === 'incorrect') {
      play('miss');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.attemptSeed]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  useEffect(() => {
    if (game.status !== 'correct') return;
    const timer = window.setTimeout(() => game.next(), 1100);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  if (game.completed) {
    return (
      <PageLayout title={t('numberLinePlace.gameName')} context={t('grades.7')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
        <SignedCompletion
          icon="📍"
          titleKey="numberLinePlace.completion.title"
          total={game.total}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      </PageLayout>
    );
  }

  const challenge = game.challenge;
  const clicked = game.status === 'incorrect' ? game.lastAnswer : null;
  const mistake = clicked === null ? null : classifyPlacement(challenge, clicked);
  const count = placementCount(challenge);
  const solved = game.status === 'correct';

  const spans: NumberLineSpan[] = [];
  const regions: NumberLineRegion[] = [];

  if (solved) {
    spans.push({
      id: 'solved',
      from: 0,
      to: challenge.target,
      label: String(Math.abs(challenge.target)),
      variant: 'correct',
    });
  } else if (mistake === 'signFlip' && clicked !== null) {
    // The distance is right, so measure it — and shade the side it belongs on.
    spans.push({
      id: 'flip',
      from: 0,
      to: clicked,
      label: String(Math.abs(clicked)),
      variant: 'incorrect',
    });
    regions.push({ id: 'side', from: 0, to: challenge.target > 0 ? challenge.max : challenge.min });
  } else if (mistake === 'offByTicks' && clicked !== null) {
    spans.push({
      id: 'counted',
      from: challenge.anchor,
      to: clicked,
      label: String(Math.abs(clicked - challenge.anchor)),
      variant: 'incorrect',
    });
  } else if (mistake === 'other') {
    // One tick interval, measured: "this is what a single step is worth".
    spans.push({
      id: 'step',
      from: 0,
      to: challenge.step,
      label: String(challenge.step),
    });
  }

  function handleSelect(id: string) {
    if (solved) return;
    const value = Number(id.replace('tick-', ''));
    if (!Number.isFinite(value)) return;
    game.submit(value);
  }

  return (
    <PageLayout title={t('numberLinePlace.gameName')} context={t('grades.7')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
      <div className="signed-activity">
        <div className="signed-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="signedNumbers.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <p className="signed-activity-prompt">
          {t('numberLinePlace.prompt.locate')}{' '}
          <MathText className="signed-activity-focus">{formatSigned(challenge.target)}</MathText>
          {t('numberLinePlace.prompt.trailing')}
        </p>

        <NumberLine
          size="lg"
          min={challenge.min}
          max={challenge.max}
          step={challenge.step}
          labeledValues={challenge.labeledValues}
          spans={spans}
          regions={regions}
          clickablePoints={tickValues(challenge.min, challenge.max, challenge.step).map((value) => ({
            id: pointId(value),
            value,
          }))}
          onSelectPoint={handleSelect}
          selectedPointId={clicked !== null ? pointId(clicked) : solved ? pointId(challenge.target) : null}
          correctPointId={solved ? pointId(challenge.target) : null}
          pointsAnswered={game.status !== 'unanswered'}
          pointsLocked={solved}
        />

        {solved && (
          <div className="signed-activity-feedback">
            <p className="feedback-correct-text">{correctMessage}</p>
            <p className="signed-activity-recap">
              {t('numberLinePlace.feedback.recap', {
                count: count.ticks,
                direction: t(`numberLinePlace.direction.${count.direction}`),
                step: challenge.step,
              })}
            </p>
          </div>
        )}

        {clicked !== null && (
          <div className="signed-activity-feedback feedback-hint-text">
            <p>
              {t('numberLinePlace.feedback.youClicked')} <MathText>{formatSigned(clicked)}</MathText>
            </p>
            {mistake === 'signFlip' && (
              <p>
                {t(challenge.target < 0 ? 'numberLinePlace.feedback.shouldBeLeft' : 'numberLinePlace.feedback.shouldBeRight')}
              </p>
            )}
            {/* Deliberately no count: it would hand over the answer. */}
            {mistake === 'offByTicks' && (
              <p>{t('numberLinePlace.feedback.countAgain', { step: challenge.step })}</p>
            )}
            {mistake === 'other' && <p>{t('numberLinePlace.feedback.oneTickWorth', { step: challenge.step })}</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
