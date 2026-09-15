import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { NumberLine, type NumberLineMarker, type NumberLineSpan } from '../components/NumberLine';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { SignedCompletion } from '../components/SignedCompletion';
import { ABSOLUTE_VALUE_TOTAL_COUNT, useAbsoluteValueGame } from '../hooks/useAbsoluteValueGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { classifyAbsolute, tickValues } from '../data/games/absoluteValueData';
import { formatAbsolute, formatSigned, formatTerm } from '../utils/signedNumbers';
import type { AbsoluteChallenge } from '../types/absoluteValue';
import './SignedNumbersShared.css';

const GAME_ID = 'absoluteValue';
const SIGNED_NUMBERS_PATH = '/grade/7/signed-numbers';

const pointId = (value: number) => `tick-${value}`;

export function AbsoluteValuePage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useAbsoluteValueGame();
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: ABSOLUTE_VALUE_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('absoluteValue.feedback.correctMessages', { returnObjects: true }) as string[];
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
      <PageLayout title={t('absoluteValue.gameName')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
        <SignedCompletion
          icon="📏"
          titleKey="absoluteValue.completion.title"
          total={game.total}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      </PageLayout>
    );
  }

  const challenge = game.challenge;
  const clicked = game.status === 'incorrect' ? game.lastAnswer : null;
  const mistake = clicked === null ? null : classifyAbsolute(challenge, clicked);
  const solved = game.status === 'correct';

  const markers: NumberLineMarker[] = challenge.plotted.map((point) => ({
    id: point.id,
    value: point.value,
    label: point.label,
    variant: 'start',
  }));

  const spans: NumberLineSpan[] = [];
  if (solved) {
    spans.push(solvedSpan(challenge));
  } else if (clicked !== null) {
    if (challenge.kind === 'distanceBetween' && challenge.partner !== null) {
      // Show the gap to count, but never write its size on it.
      spans.push({ id: 'gap', from: challenge.subject, to: challenge.partner });
    } else if (mistake === 'negatedAnswer' || mistake === 'wrongSide') {
      spans.push({ id: 'from-zero', from: 0, to: clicked, label: String(Math.abs(clicked)), variant: 'incorrect' });
    }
  }

  function handleSelect(id: string) {
    if (solved) return;
    const value = Number(id.replace('tick-', ''));
    if (!Number.isFinite(value)) return;
    game.submit(value);
  }

  return (
    <PageLayout title={t('absoluteValue.gameName')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
      <div className="signed-activity">
        <div className="signed-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="signedNumbers.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <AbsolutePrompt challenge={challenge} />

        <NumberLine
          size="lg"
          min={challenge.min}
          max={challenge.max}
          step={challenge.step}
          markers={markers}
          spans={spans}
          clickablePoints={tickValues(challenge.min, challenge.max, challenge.step).map((value) => ({
            id: pointId(value),
            value,
          }))}
          onSelectPoint={handleSelect}
          selectedPointId={clicked !== null ? pointId(clicked) : solved ? pointId(challenge.answer) : null}
          correctPointId={solved ? pointId(challenge.answer) : null}
          pointsAnswered={game.status !== 'unanswered'}
          pointsLocked={solved}
        />

        {solved && (
          <div className="signed-activity-feedback">
            <p className="feedback-correct-text">{correctMessage}</p>
            <p className="signed-activity-recap">
              {t('absoluteValue.feedback.recapLabel')} <MathText>{recapNotation(challenge)}</MathText>
            </p>
          </div>
        )}

        {clicked !== null && (
          <div className="signed-activity-feedback feedback-hint-text">
            <p>
              {t('absoluteValue.feedback.youClicked')} <MathText>{formatSigned(clicked)}</MathText>
            </p>
            {mistake === 'negatedAnswer' && <p>{t('absoluteValue.feedback.neverNegative')}</p>}
            {mistake === 'wrongSide' && <p>{t('absoluteValue.feedback.wrongSide')}</p>}
            {(mistake === 'offByGap' || mistake === 'other') && (
              <p>
                {challenge.kind === 'distanceBetween'
                  ? t('absoluteValue.feedback.countTheGap')
                  : t('absoluteValue.feedback.measureFromZero')}
              </p>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function solvedSpan(challenge: AbsoluteChallenge): NumberLineSpan {
  if (challenge.kind === 'distanceBetween' && challenge.partner !== null) {
    return {
      id: 'solved',
      from: challenge.subject,
      to: challenge.partner,
      label: String(challenge.answer),
      variant: 'correct',
    };
  }
  return {
    id: 'solved',
    from: 0,
    to: challenge.kind === 'evaluate' ? challenge.subject : challenge.answer,
    label: String(Math.abs(challenge.answer)),
    variant: 'correct',
  };
}

/** The same measurement written symbolically, so the notation and the picture line up. */
function recapNotation(challenge: AbsoluteChallenge): string {
  if (challenge.kind === 'distanceBetween' && challenge.partner !== null) {
    return `|${formatTerm(challenge.partner)} - ${formatTerm(challenge.subject)}| = ${challenge.answer}`;
  }
  const value = challenge.kind === 'evaluate' ? challenge.subject : challenge.answer;
  return `${formatAbsolute(value)} = ${Math.abs(challenge.answer)}`;
}

function AbsolutePrompt({ challenge }: { challenge: AbsoluteChallenge }) {
  const { t } = useTranslation();

  if (challenge.kind === 'evaluate') {
    return (
      <p className="signed-activity-prompt">
        {t('absoluteValue.prompt.evaluate')}{' '}
        <MathText className="signed-activity-focus">{formatAbsolute(challenge.subject)}</MathText>
        {t('absoluteValue.prompt.trailing')}
      </p>
    );
  }

  if (challenge.kind === 'findFromDistance') {
    return (
      <p className="signed-activity-prompt">
        {t(
          challenge.side === 'negative'
            ? 'absoluteValue.prompt.findFromDistance'
            : 'absoluteValue.prompt.findFromDistancePositive',
          { distance: challenge.distance },
        )}
      </p>
    );
  }

  return (
    <p className="signed-activity-prompt">
      {t('absoluteValue.prompt.distanceBetween')}
    </p>
  );
}
