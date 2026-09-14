import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { QuizCompletion } from '../components/quiz/QuizCompletion';
import { VocabularyQuestionRenderer } from '../components/quiz/VocabularyQuestionRenderer';
import { useQuizRound } from '../hooks/useQuizRound';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { meetTheAxesQuestions } from '../data/exercises/meetTheAxes';
import './MeetTheAxesPage.css';

const GAME_ID = 'meetTheAxes';

export function MeetTheAxesPage() {
  const { t } = useTranslation();
  const {
    question,
    index,
    total,
    selectedId,
    status,
    score,
    attempt,
    completed,
    mistakes,
    roundKey,
    select,
    next,
    retry,
  } = useQuizRound({
    pool: meetTheAxesQuestions,
    count: meetTheAxesQuestions.length,
    getId: (item) => item.id,
    getCorrectId: (item) => item.correctId,
  });

  useGameSessionTracking(GAME_ID, { total, score, completed, mistakes, roundKey });

  const isLastQuestion = index === total - 1;

  return (
    <PageLayout title={t('exercises.meetTheAxes.name')} backTo="/grade/7/coordinate-system" backLabel={t('coordinateSystemPage.title')}>
      {completed ? (
        <QuizCompletion score={score} total={total} onRetry={retry} />
      ) : (
        <div className="meet-the-axes">
          <QuizProgress current={index + 1} total={total} />
          <VocabularyQuestionRenderer
            question={question}
            selectedId={selectedId}
            status={status}
            highlightSeed={attempt}
            onSelect={select}
          />
          {status !== 'unanswered' && (
            <div className="meet-the-axes-controls">
              <button type="button" className="btn btn-primary" onClick={next}>
                {isLastQuestion ? t('quiz.actions.finish') : t('quiz.actions.next')}
              </button>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
