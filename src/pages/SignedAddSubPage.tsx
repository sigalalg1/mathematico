import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { NumberLine, type NumberLineHop } from '../components/NumberLine';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { SignedCompletion } from '../components/SignedCompletion';
import { SIGNED_ADD_SUB_TOTAL_COUNT, useSignedAddSubGame } from '../hooks/useSignedAddSubGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { classifyAddSub, moveDirection, tickValues } from '../data/games/signedAddSubData';
import { formatExpression, formatSigned } from '../utils/signedNumbers';
import './SignedNumbersShared.css';

const GAME_ID = 'signedAddSub';
const SIGNED_NUMBERS_PATH = '/grade/7/signed-numbers';

const pointId = (value: number) => `tick-${value}`;

export function SignedAddSubPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useSignedAddSubGame();
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: SIGNED_ADD_SUB_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('move');
      const messages = t('signedAddSub.feedback.correctMessages', { returnObjects: true }) as string[];
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
    // A touch longer than the other activities so the walker's slide finishes.
    if (game.status !== 'correct') return;
    const timer = window.setTimeout(() => game.next(), 1400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  if (game.completed) {
    return (
      <PageLayout title={t('signedAddSub.gameName')} context={t('grades.7')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
        <SignedCompletion
          icon="👣"
          titleKey="signedAddSub.completion.title"
          total={game.total}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      </PageLayout>
    );
  }

  const challenge = game.challenge;
  const clicked = game.status === 'incorrect' ? game.lastAnswer : null;
  const mistake = clicked === null ? null : classifyAddSub(challenge, clicked);
  const solved = game.status === 'correct';
  const direction = moveDirection(challenge.delta);

  const hops: NumberLineHop[] = [];
  if (solved) {
    hops.push({ id: 'move', from: challenge.start, to: challenge.result, label: formatSigned(challenge.delta), variant: 'correct' });
  } else if (clicked !== null) {
    // Draw the move the student actually made, so they can see it against the
    // expression instead of just being told it was wrong.
    hops.push({ id: 'attempt', from: challenge.start, to: clicked, label: formatSigned(clicked - challenge.start), variant: 'incorrect' });
    if (mistake === 'wrongDirection') {
      // Point the first step the right way — the direction, never the count.
      hops.push({ id: 'nudge', from: challenge.start, to: challenge.start + Math.sign(challenge.delta) * challenge.step });
    }
  }

  function handleSelect(id: string) {
    if (solved) return;
    const value = Number(id.replace('tick-', ''));
    if (!Number.isFinite(value)) return;
    game.submit(value);
  }

  return (
    <PageLayout title={t('signedAddSub.gameName')} context={t('grades.7')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
      <div className="signed-activity">
        <div className="signed-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="signedNumbers.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <MathText className="signed-activity-expression">
          {formatExpression(challenge.start, challenge.operator, challenge.term)} = ?
        </MathText>

        <p className="signed-activity-prompt">{t('signedAddSub.prompt.land')}</p>

        <NumberLine
          size="lg"
          min={challenge.min}
          max={challenge.max}
          step={challenge.step}
          // Unlabelled on purpose: the axis, the arc and the expression already
          // say which number it is standing on, and a caption would sit under
          // the arc that explains the move.
          walker={{ value: solved ? challenge.result : challenge.start }}
          hops={hops}
          hopSeed={game.attemptSeed}
          clickablePoints={tickValues(challenge.min, challenge.max, challenge.step).map((value) => ({
            id: pointId(value),
            value,
          }))}
          onSelectPoint={handleSelect}
          selectedPointId={clicked !== null ? pointId(clicked) : solved ? pointId(challenge.result) : null}
          correctPointId={solved ? pointId(challenge.result) : null}
          pointsAnswered={game.status !== 'unanswered'}
          pointsLocked={solved}
        />

        {solved && (
          <div className="signed-activity-feedback">
            <p className="feedback-correct-text">{correctMessage}</p>
            <p className="signed-activity-recap">
              {t('signedAddSub.feedback.recapLabel')}{' '}
              <MathText>
                {formatExpression(challenge.start, challenge.operator, challenge.term)} = {formatSigned(challenge.result)}
              </MathText>
            </p>
          </div>
        )}

        {clicked !== null && (
          <div className="signed-activity-feedback feedback-hint-text">
            <p>
              {t('signedAddSub.feedback.youClicked')} <MathText>{formatSigned(clicked)}</MathText>
            </p>
            {mistake === 'wrongDirection' && (
              <p>
                {challenge.operator === '-' && challenge.term < 0
                  ? t('signedAddSub.feedback.subtractNegative')
                  : challenge.operator === '+' && challenge.term < 0
                    ? t('signedAddSub.feedback.addNegative')
                    : t('signedAddSub.feedback.wrongDirection', { direction: t(`signedAddSub.direction.${direction}`) })}
              </p>
            )}
            {mistake === 'countSlip' && <p>{t('signedAddSub.feedback.countSteps')}</p>}
            {mistake === 'other' && (
              <p>{t('signedAddSub.feedback.wrongDirection', { direction: t(`signedAddSub.direction.${direction}`) })}</p>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
