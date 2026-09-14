import { useTranslation } from 'react-i18next';
import type { GridTargetVocabularyQuestion } from '../../types/vocabularyQuiz';
import type { GridTargetId } from '../../types/vocabularyQuiz';
import type { QuizAnswerStatus } from '../../types/quiz';
import { CoordinateGrid } from '../CoordinateGrid';
import './QuizShared.css';

interface GridTargetQuestionViewProps {
  question: GridTargetVocabularyQuestion;
  selectedTargetId: string | null;
  status: QuizAnswerStatus;
  highlightSeed: number;
  onSelect: (targetId: string) => void;
}

const TARGET_LABEL_KEYS: Record<GridTargetId, string> = {
  xAxis: 'vocabulary.targets.xAxis',
  yAxis: 'vocabulary.targets.yAxis',
  origin: 'vocabulary.targets.origin',
};

export function GridTargetQuestionView({
  question,
  selectedTargetId,
  status,
  highlightSeed,
  onSelect,
}: GridTargetQuestionViewProps) {
  const { t } = useTranslation();
  const answered = status !== 'unanswered';
  const targetLabels: Partial<Record<GridTargetId, string>> = Object.fromEntries(
    question.targets.map((id) => [id, t(TARGET_LABEL_KEYS[id])]),
  );

  return (
    <div className="question-card">
      <p className="question-prompt">{t(question.promptKey)}</p>
      <CoordinateGrid
        interactiveTargets={question.targets}
        targetLabels={targetLabels}
        selectedTargetId={selectedTargetId as GridTargetId | null}
        correctTargetId={question.correctId as GridTargetId}
        status={status}
        highlightSeed={highlightSeed}
        onSelectTarget={(id) => onSelect(id)}
      />
      {answered && (
        <div className={`question-feedback ${status === 'correct' ? 'feedback-correct' : 'feedback-incorrect'}`}>
          <span className="feedback-title">
            <span className="feedback-icon" aria-hidden="true">
              {status === 'correct' ? '✓' : '✦'}
            </span>
            {status === 'correct' ? t('quiz.feedback.correctTitle') : t('quiz.feedback.incorrectTitle')}
          </span>
          {status === 'incorrect' && <p className="feedback-explanation">{t(question.explanationKey)}</p>}
        </div>
      )}
    </div>
  );
}
