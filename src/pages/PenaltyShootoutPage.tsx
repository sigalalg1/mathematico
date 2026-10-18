import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSound } from '../audio/useSound';
import { MathText } from '../components/MathText';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import { Goalkeeper, type KeeperState } from '../components/Goalkeeper';
import { PENALTY_SHOOTOUT_COUNT } from '../data/games/penaltyShootoutData';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { usePenaltyShootoutGame } from '../hooks/usePenaltyShootoutGame';
import type { GoalTarget, MissOutcome, ShootoutChoice } from '../types/penaltyShootout';
import './PenaltyShootoutPage.css';

const GAME_ID = 'penaltyShootout';
const GRADE_PATH = '/grade/4';
const KICK_MS = 360;
const RESULT_MS = 820;

type Phase = 'ready' | 'kicking' | 'goal' | MissOutcome;

export function PenaltyShootoutPage() {
  const { t } = useTranslation();
  const { enabled, play, toggle } = useSound();
  const game = usePenaltyShootoutGame();
  const question = game.challenge;
  const [phase, setPhase] = useState<Phase>('ready');
  const [selected, setSelected] = useState<ShootoutChoice | null>(null);

  useGameSessionTracking(GAME_ID, {
    total: game.total,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setPhase('ready');
    setSelected(null);
  }

  useEffect(() => {
    if (phase !== 'kicking' || selected === null) return undefined;
    const timer = window.setTimeout(() => {
      const correct = selected.value === question.answer;
      const result = correct ? 'goal' : question.wrongOutcomes[selected.target];
      setPhase(result);
      if (result === 'goal') play('footballGoal');
      else if (result === 'post') play('footballPost');
      else play('footballSave');
    }, KICK_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selected]);

  useEffect(() => {
    if (phase === 'ready' || phase === 'kicking') return undefined;
    const timer = window.setTimeout(() => {
      if (phase === 'goal') game.next();
      else {
        setSelected(null);
        setPhase('ready');
      }
    }, RESULT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (game.completed) {
      play('whistle');
      play('gameComplete');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  function kick(choice: ShootoutChoice) {
    if (phase !== 'ready') return;
    setSelected(choice);
    setPhase('kicking');
    game.submit({ value: choice.value });
    play('footballKick');
  }

  if (game.completed) {
    return (
      <PageLayout title={t('penaltyShootout.gameName')} context={t('grades.4')} backTo={GRADE_PATH} backLabel={t('nav.grade4Topics')} variant="game">
        <div className="penalty-shootout">
          <section className="ps-finale">
            <div className="ps-trophy" aria-hidden="true">⚽</div>
            <h2>{t('penaltyShootout.completion.title')}</h2>
            <p>{t('penaltyShootout.completion.body', { count: PENALTY_SHOOTOUT_COUNT })}</p>
            <div className="ps-actions">
              <button className="btn ps-primary" type="button" onClick={game.retry}>{t('penaltyShootout.actions.playAgain')}</button>
              <Link className="btn ps-secondary" to={GRADE_PATH}>{t('penaltyShootout.actions.back')}</Link>
            </div>
          </section>
        </div>
      </PageLayout>
    );
  }

  const keeperState = getKeeperState(
    phase,
    selected?.target,
    selected?.value === question.answer,
    selected ? question.wrongOutcomes[selected.target] : undefined,
    question.keeperDive,
  );
  return (
    <PageLayout title={t('penaltyShootout.gameName')} context={t('grades.4')} backTo={GRADE_PATH} backLabel={t('nav.grade4Topics')} variant="game">
      <div className="penalty-shootout">
        <section className={`ps-stadium ps-phase-${phase}`}>
          <header className="ps-scoreboard">
            <div className="ps-progress" role="progressbar" aria-valuenow={game.index + 1} aria-valuemin={1} aria-valuemax={game.total}>
              <span aria-hidden="true">⚽</span>
              <span>{t('penaltyShootout.progress', { current: game.index + 1, total: game.total })}</span>
            </div>
            <SoundToggle enabled={enabled} onToggle={toggle} />
          </header>

          <div className="ps-crowd" aria-hidden="true" />
          <div className="ps-problem">
            <span>{t('penaltyShootout.prompt')}</span>
            <MathText>{question.left} + {question.right} = ?</MathText>
          </div>

          <div className="ps-pitch">
            <div className={`ps-goal${phase === 'goal' ? ' ps-goal-react' : ''}`}>
              <div className="ps-net" aria-hidden="true" />
              <Goalkeeper state={keeperState} diveSide={selected?.target?.includes('Right') ? 'right' : 'left'} />
              <div className="ps-targets">
                {question.choices.map((choice) => (
                  <button
                    key={choice.target}
                    type="button"
                    className={`ps-target ps-target-${choice.target}${selected?.target === choice.target ? ' is-selected' : ''}`}
                    onClick={() => kick(choice)}
                    disabled={phase !== 'ready'}
                    aria-label={t('penaltyShootout.a11y.target', { position: t(`penaltyShootout.positions.${choice.target}`), answer: choice.value })}
                  >
                    <MathText>{choice.value}</MathText>
                  </button>
                ))}
              </div>
            </div>

            <div className="ps-penalty-arc" aria-hidden="true" />
            <div className="ps-player" aria-hidden="true"><span className="ps-player-head" /><span className="ps-player-body" /><span className="ps-player-leg" /></div>
            <div className={`ps-ball${selected ? ` ps-ball-${selected.target}` : ''}${phase !== 'ready' ? ' ps-ball-flight' : ''}${phase === 'wide' ? ' ps-ball-wide' : ''}${phase === 'post' ? ' ps-ball-post' : ''}`} aria-hidden="true">⚽</div>
            {phase !== 'ready' && phase !== 'kicking' && (
              <div className={`ps-result ps-result-${phase}`} role="status">{t(`penaltyShootout.results.${phase}`)}</div>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

function getKeeperState(
  phase: Phase,
  target: GoalTarget | undefined,
  correct: boolean,
  missOutcome: MissOutcome | undefined,
  plannedDive: 'left' | 'right',
): KeeperState {
  if (phase === 'goal') return 'disappointed';
  if (phase === 'save') return 'save';
  if (phase === 'kicking') {
    if (correct && target) return target.includes('Left') ? 'diveRight' : 'diveLeft';
    const side = missOutcome === 'save' && target ? (target.includes('Left') ? 'left' : 'right') : plannedDive;
    return side === 'left' ? 'diveLeft' : 'diveRight';
  }
  return 'ready';
}
