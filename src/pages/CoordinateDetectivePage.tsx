import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { useCoordinateDetectiveGame, COORDINATE_DETECTIVE_TOTAL_COUNT } from '../hooks/useCoordinateDetectiveGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import '../components/quiz/QuizShared.css';
import './CoordinateDetectivePage.css';

const GAME_ID = 'coordinateDetective';

export function CoordinateDetectivePage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useCoordinateDetectiveGame();
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: COORDINATE_DETECTIVE_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('coordinateDetective.feedback.correctMessages', { returnObjects: true }) as string[];
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

  const challenge = game.challenge;
  const answered = game.status !== 'unanswered';

  return (
    <PageLayout
      title={t('coordinateDetective.gameName')}
      context={t('grades.7')} backTo="/grade/7/coordinate-system"
      backLabel={t('coordinateSystemPage.title')}
    >
      {game.completed ? (
        <CoordinateDetectiveCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
      ) : (
        <div className="coordinate-detective">
          <div className="coordinate-detective-top">
            <QuizProgress current={game.index + 1} total={game.total} labelKey="coordinateDetective.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <p className="coordinate-detective-prompt">{t('coordinateDetective.prompt')}</p>

          <CoordinateGrid
            size="lg"
            point={challenge.target}
            attemptMarker={challenge.wrongAnswer}
            vertexLabels={[
              { point: challenge.target, label: '✓' },
              { point: challenge.wrongAnswer, label: '✗' },
            ]}
          />

          <div className="coordinate-detective-legend">
            <span>
              <span className="legend-dot legend-dot-target" /> {t('coordinateDetective.legendTarget')}
            </span>
            <span>
              <span className="legend-dot legend-dot-wrong" /> {t('coordinateDetective.legendWrong')}
            </span>
          </div>

          <div className="question-options coordinate-detective-choices">
            {challenge.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`question-option ${answered && option === challenge.category ? 'is-correct' : ''} ${
                  answered && game.lastAnswer === option && option !== challenge.category ? 'is-incorrect' : ''
                }`}
                onClick={() => !answered && game.submit(option)}
                disabled={answered}
              >
                {t(`coordinateDetective.categories.${option}`)}
              </button>
            ))}
          </div>

          {game.status === 'correct' && <p className="coordinate-detective-feedback feedback-correct-text">{correctMessage}</p>}
          {game.status === 'incorrect' && (
            <p className="coordinate-detective-feedback feedback-hint-text">{t('coordinateDetective.feedback.incorrectHint')}</p>
          )}

          {answered && (
            <button type="button" className="btn btn-primary" onClick={game.next}>
              {t('quiz.actions.next')}
            </button>
          )}
        </div>
      )}
    </PageLayout>
  );
}

interface CoordinateDetectiveCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function CoordinateDetectiveCompletion({ total, firstTryCount, onRetry }: CoordinateDetectiveCompletionProps) {
  const { t } = useTranslation();
  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        🔍
      </span>
      <h2 className="quiz-completion-title">{t('coordinateDetective.completion.title')}</h2>
      <p className="quiz-completion-score">{t('coordinateDetective.completion.summary', { total })}</p>
      <p className="coordinate-detective-completion-detail">{t('coordinateDetective.completion.firstTry', { count: firstTryCount })}</p>
      <div className="coordinate-detective-completion-actions">
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
