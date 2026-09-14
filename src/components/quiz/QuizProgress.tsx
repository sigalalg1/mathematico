import { useTranslation } from 'react-i18next';
import './QuizProgress.css';

interface QuizProgressProps {
  current: number;
  total: number;
  labelKey?: string;
}

export function QuizProgress({ current, total, labelKey = 'quiz.progressLabel' }: QuizProgressProps) {
  const { t } = useTranslation();
  const percent = (current / total) * 100;

  return (
    <div className="quiz-progress" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
      <span className="quiz-progress-label">{t(labelKey, { current, total })}</span>
      <div className="quiz-progress-track">
        <div className="quiz-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
