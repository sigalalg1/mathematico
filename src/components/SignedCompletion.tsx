import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface SignedCompletionProps {
  icon: string;
  /** Per-activity title key, e.g. `numberLinePlace.completion.title`. */
  titleKey: string;
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

/** The shared end-of-session card for every Signed Numbers activity. */
export function SignedCompletion({ icon, titleKey, total, firstTryCount, onRetry }: SignedCompletionProps) {
  const { t } = useTranslation();

  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        {icon}
      </span>
      <h2 className="quiz-completion-title">{t(titleKey)}</h2>
      <p className="quiz-completion-score">{t('signedNumbers.completion.summary', { total })}</p>
      <p className="signed-activity-completion-detail">{t('signedNumbers.completion.firstTry', { count: firstTryCount })}</p>
      <div className="signed-activity-completion-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('signedNumbers.actions.playAgain')}
        </button>
        <Link className="btn btn-secondary" to="/grade/7/signed-numbers">
          {t('signedNumbers.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}
