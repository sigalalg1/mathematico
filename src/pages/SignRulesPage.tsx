import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { NumberLine, type NumberLineSpan } from '../components/NumberLine';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { SignedCompletion } from '../components/SignedCompletion';
import { SIGN_RULES_TOTAL_COUNT, useSignRulesGame } from '../hooks/useSignRulesGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { classifySignRule, tickValues } from '../data/games/signRulesData';
import { formatExpression, formatSigned } from '../utils/signedNumbers';
import { SIGN_RULE_FAMILIES, type SignRuleChallenge, type SignRuleFamily } from '../types/signRules';
import './SignedNumbersShared.css';

const GAME_ID = 'signRules';
const SIGNED_NUMBERS_PATH = '/grade/7/signed-numbers';

const pointId = (value: number) => `tick-${value}`;

export function SignRulesPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useSignRulesGame();
  const [correctMessage, setCorrectMessage] = useState('');
  const [discovered, setDiscovered] = useState<SignRuleFamily[]>([]);

  useGameSessionTracking(GAME_ID, {
    total: SIGN_RULES_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  const family = game.completed ? null : game.challenge.family;

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('signRules.feedback.correctMessages', { returnObjects: true }) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the sound, not derived state
      setCorrectMessage(messages[Math.floor(Math.random() * messages.length)]);
      // A running log of what the student has proved for themselves.
      if (family) setDiscovered((current) => (current.includes(family) ? current : [...current, family]));
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
    const timer = window.setTimeout(() => game.next(), 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  // A replay starts the discovery board from scratch.
  function handleRetry() {
    setDiscovered([]);
    game.retry();
  }

  if (game.completed) {
    return (
      <PageLayout title={t('signRules.gameName')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
        <SignedCompletion
          icon="✖️"
          titleKey="signRules.completion.title"
          total={game.total}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={handleRetry}
        />
      </PageLayout>
    );
  }

  const challenge = game.challenge;
  const clicked = game.status === 'incorrect' ? game.lastAnswer : null;
  const mistake = clicked === null ? null : classifySignRule(challenge, clicked);
  const solved = game.status === 'correct';
  // The pattern is the lesson for the discovery questions and the hint for the rest.
  const ladderVisible = challenge.ladder.length > 0 && (challenge.showLadder || clicked !== null);

  const spans: NumberLineSpan[] = solved
    ? [{ id: 'result', from: 0, to: challenge.result, label: String(Math.abs(challenge.result)), variant: 'correct' }]
    : [];

  function handleSelect(id: string) {
    if (solved) return;
    const value = Number(id.replace('tick-', ''));
    if (!Number.isFinite(value)) return;
    game.submit(value);
  }

  return (
    <PageLayout title={t('signRules.gameName')} backTo={SIGNED_NUMBERS_PATH} backLabel={t('signedNumbersPage.title')}>
      <div className="signed-activity">
        <div className="signed-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="signedNumbers.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        {ladderVisible && <SignLadder challenge={challenge} />}

        <MathText className="signed-activity-expression">
          {formatExpression(challenge.left, challenge.operator, challenge.right)} = ?
        </MathText>

        <p className="signed-activity-prompt">
          {t(challenge.showLadder ? 'signRules.prompt.continuePattern' : 'signRules.prompt.solve')}
        </p>

        <NumberLine
          size="lg"
          min={challenge.min}
          max={challenge.max}
          step={challenge.step}
          spans={spans}
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

        <RuleStrip discovered={discovered} />

        {solved && (
          <div className="signed-activity-feedback">
            <p className="feedback-correct-text">{correctMessage}</p>
            <p className="signed-activity-recap">
              <MathText>
                {formatExpression(challenge.left, challenge.operator, challenge.right)} = {formatSigned(challenge.result)}
              </MathText>
            </p>
          </div>
        )}

        {clicked !== null && (
          <div className="signed-activity-feedback feedback-hint-text">
            <p>
              {t('signRules.feedback.youClicked')} <MathText>{formatSigned(clicked)}</MathText>
            </p>
            {mistake === 'signError' && <p>{t('signRules.feedback.signError')}</p>}
            {mistake === 'magnitudeError' && <p>{t('signRules.feedback.magnitudeError')}</p>}
            {ladderVisible && !challenge.showLadder && <p>{t('signRules.feedback.ladderHint')}</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/** The already-solved rows that lead into the question, so the pattern is visible. */
function SignLadder({ challenge }: { challenge: SignRuleChallenge }) {
  const { t } = useTranslation();
  return (
    <div className="signed-ladder">
      <p className="signed-activity-note">{t('signRules.ladderTitle')}</p>
      {challenge.ladder.map((row) => (
        <MathText key={`ladder-${row.left}`} className="signed-ladder-row">
          {formatExpression(row.left, '×', row.right)} = {formatSigned(row.result)}
        </MathText>
      ))}
    </div>
  );
}

/** The four sign rules, each lighting up once the student has proved it themselves. */
function RuleStrip({ discovered }: { discovered: SignRuleFamily[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="signed-activity-note">{t('signRules.rulesTitle')}</p>
      <div className="signed-rule-strip">
        {SIGN_RULE_FAMILIES.map((rule) => (
          <span
            key={rule}
            className={`signed-rule-chip ${discovered.includes(rule) ? 'is-discovered' : ''}`}
            dir="ltr"
            aria-label={t(`signRules.rules.${rule}`)}
          >
            {t(`signRules.rules.${rule}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
