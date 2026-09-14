import { useTranslation } from 'react-i18next';
import './QuizCompletion.css';

interface QuizCompletionProps {
  score: number;
  total: number;
  onRetry: () => void;
}

export function QuizCompletion({ score, total, onRetry }: QuizCompletionProps) {
  const { t } = useTranslation();

  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        🎉
      </span>
      <h2 className="quiz-completion-title">{t('quiz.completion.title')}</h2>
      <p className="quiz-completion-score">{t('quiz.completion.score', { score, total })}</p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        {t('quiz.actions.tryAgain')}
      </button>
    </div>
  );
}
