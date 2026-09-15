import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { NumberLine, type NumberLineRegion, type NumberLineSpan } from '../components/NumberLine';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { SignedCompletion } from '../components/SignedCompletion';
import { COMPARE_SIGNED_TOTAL_COUNT, useCompareSignedGame } from '../hooks/useCompareSignedGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { classifyCompare } from '../data/games/compareSignedData';
import { formatSigned } from '../utils/signedNumbers';
import './SignedNumbersShared.css';

const GAME_ID = 'compareSigned';
const SIGNED_NUMBERS_PATH = '/grade/7/signed-numbers';

export function CompareSignedPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useCompareSignedGame();
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: COMPARE_SIGNED_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('compareSigned.feedback.correctMessages', { returnObjects: true }) as string[];
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
      <PageLayout title={t('compareSigned.gameName')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
        <SignedCompletion
          icon="⚖️"
          titleKey="compareSigned.completion.title"
          total={game.total}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      </PageLayout>
    );
  }

  const challenge = game.challenge;
  const clicked = game.status === 'incorrect' ? game.lastAnswer : null;
  const mistake = clicked === null ? null : classifyCompare(challenge, clicked);
  const solved = game.status === 'correct';
  const idOf = (value: number) => challenge.candidates.find((candidate) => candidate.value === value)?.id ?? null;

  const spans: NumberLineSpan[] = [];
  const regions: NumberLineRegion[] = [];

  if (solved) {
    // Shade the whole stretch of the line the answer wins on.
    regions.push({
      id: 'winning-side',
      from: challenge.answer,
      to: challenge.goal === 'greatest' ? challenge.max : challenge.min,
      variant: 'correct',
    });
  } else if (clicked !== null) {
    // Measure each candidate's distance from 0: it is exactly the number the
    // student compared instead of the value itself.
    for (const candidate of challenge.candidates) {
      spans.push({
        id: `distance-${candidate.id}`,
        from: 0,
        to: candidate.value,
        label: String(Math.abs(candidate.value)),
        variant: candidate.value === clicked ? 'incorrect' : 'default',
      });
    }
  }

  function handleSelect(id: string) {
    if (solved) return;
    const candidate = challenge.candidates.find((entry) => entry.id === id);
    if (!candidate) return;
    game.submit(candidate.value);
  }

  return (
    <PageLayout title={t('compareSigned.gameName')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
      <div className="signed-activity">
        <div className="signed-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="signedNumbers.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <p className="signed-activity-note">{t('compareSigned.hint')}</p>

        <p className="signed-activity-prompt">{t(`compareSigned.prompt.${challenge.goal}`)}</p>

        <NumberLine
          size="lg"
          min={challenge.min}
          max={challenge.max}
          step={challenge.step}
          spans={spans}
          regions={regions}
          clickablePoints={challenge.candidates.map((candidate) => ({
            id: candidate.id,
            value: candidate.value,
            label: formatSigned(candidate.value),
          }))}
          onSelectPoint={handleSelect}
          selectedPointId={clicked !== null ? idOf(clicked) : solved ? challenge.correctCandidateId : null}
          correctPointId={solved ? challenge.correctCandidateId : null}
          pointsAnswered={game.status !== 'unanswered'}
          pointsLocked={solved}
        />

        {solved && (
          <div className="signed-activity-feedback">
            <p className="feedback-correct-text">{correctMessage}</p>
            <p className="signed-activity-recap">
              {t(challenge.goal === 'greatest' ? 'compareSigned.feedback.recapGreatest' : 'compareSigned.feedback.recapSmallest')}
            </p>
          </div>
        )}

        {clicked !== null && (
          <div className="signed-activity-feedback feedback-hint-text">
            <p>
              {t('compareSigned.feedback.youClicked')} <MathText>{formatSigned(clicked)}</MathText>
            </p>
            {mistake === 'signConfusion' && <p>{t('compareSigned.feedback.negativeIsAlwaysSmaller')}</p>}
            {mistake === 'absoluteConfusion' && <p>{t('compareSigned.feedback.biggerDistanceIsSmaller')}</p>}
            {mistake === 'other' && <p>{t('compareSigned.feedback.lookRight')}</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
