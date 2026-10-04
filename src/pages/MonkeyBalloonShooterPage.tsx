import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import { Jungle, Monkey, MonkeyBalloonScene } from '../components/MonkeyBalloonScene';
import { useMonkeyBalloonShooterGame } from '../hooks/useMonkeyBalloonShooterGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { MONKEY_SHOOTER_TOTAL } from '../data/games/monkeyBalloonShooterData';
import { useSound } from '../audio/useSound';

const GAME_ID = 'monkeyBalloonShooter';
const TOPIC_PATH = '/grade/4/multiplication';

/**
 * The original times-table balloon game, unchanged in behaviour: a missed shot
 * leaves the fact in the air to try again, and the session is eight facts long.
 *
 * All of the scene — jungle, monkey, dart, pop — now lives in the reusable
 * `MonkeyBalloonScene`, which is driven purely by a prompt and a set of answer
 * options. This page supplies them from the multiplication round engine; the
 * grade 2 arithmetic activities supply them from a training session instead.
 */
export function MonkeyBalloonShooterPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useMonkeyBalloonShooterGame();
  const question = game.question;

  useGameSessionTracking(GAME_ID, {
    total: MONKEY_SHOOTER_TOTAL,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  if (game.completed) {
    return (
      <PageLayout title={t('monkeyBalloonShooter.gameName')} context={t('grades.4')} backTo={TOPIC_PATH} backLabel={t('multiplicationPage.title')} variant="game">
        <div className="mb-game">
          <div className="mb-scene mb-scene-done">
            <Jungle />
            <div className="mb-completion">
              <Monkey pose="happy" />
              <h2 className="mb-completion-title">{t('monkeyBalloonShooter.completion.title')}</h2>
              <p className="mb-completion-summary">{t('monkeyBalloonShooter.completion.summary', { total: game.total })}</p>
              <div className="mb-completion-actions">
                <button type="button" className="btn mb-btn mb-btn-primary" onClick={game.retry}>
                  {t('monkeyBalloonShooter.actions.playAgain')}
                </button>
                <Link className="btn mb-btn mb-btn-ghost" to={TOPIC_PATH}>
                  {t('monkeyBalloonShooter.actions.backToTopic')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('monkeyBalloonShooter.gameName')} context={t('grades.4')} backTo={TOPIC_PATH} backLabel={t('multiplicationPage.title')} variant="game">
      <div className="mb-game">
        <MonkeyBalloonScene
          prompt={`${question.fact.left} × ${question.fact.right}`}
          promptLabel={t('monkeyBalloonShooter.prompt')}
          options={question.options.map(String)}
          correctAnswer={String(question.fact.product)}
          resetKey={`${game.index}-${game.roundKey}`}
          onShoot={(option) => game.submit(Number(option))}
          // A popped balloon moves the session on; a miss is simply retried, so
          // the child stays with the same fact until they get it.
          onShotSettled={(_, isCorrect) => {
            if (isCorrect) game.next();
          }}
          retryAfterMiss
          progress={{ current: game.index + 1, total: game.total }}
          hudExtra={<SoundToggle enabled={soundEnabled} onToggle={toggleSound} />}
          play={play}
        />
      </div>
    </PageLayout>
  );
}
