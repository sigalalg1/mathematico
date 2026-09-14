import { useTranslation } from 'react-i18next';
import type { ChoiceVocabularyQuestion, VocabularyChoice } from '../../types/vocabularyQuiz';
import type { QuizAnswerStatus } from '../../types/quiz';
import { CoordinateGrid } from '../CoordinateGrid';
import { MathText } from '../MathText';
import './QuizShared.css';

const DIRECTIONAL_GLYPHS = new Set(['←', '→', '↑', '↓']);

/**
 * Arrow-glyph answers represent a fixed spatial direction on the (always-LTR)
 * coordinate grid. Left unpinned, RTL flex mirroring would swap their screen
 * position while the glyph itself still points the original way — showing
 * "→" on the physical left. Pin the row to LTR whenever every option is one
 * of the four arrows so the glyph and its position always agree.
 */
function isDirectionalOptionSet(options: VocabularyChoice[], t: (key: string) => string): boolean {
  return options.every((option) => option.labelKey && DIRECTIONAL_GLYPHS.has(t(option.labelKey)));
}

interface ChoiceQuestionViewProps {
  question: ChoiceVocabularyQuestion;
  selectedOptionId: string | null;
  status: QuizAnswerStatus;
  highlightSeed: number;
  onSelect: (optionId: string) => void;
}

export function ChoiceQuestionView({
  question,
  selectedOptionId,
  status,
  highlightSeed,
  onSelect,
}: ChoiceQuestionViewProps) {
  const { t } = useTranslation();
  const answered = status !== 'unanswered';
  const activeHighlight = question.highlight && status === 'incorrect' ? question.highlight : null;

  return (
    <div className="question-card">
      {question.pair && (
        <MathText className="question-pair">
          ({question.pair[0]}, {question.pair[1]})
        </MathText>
      )}
      {question.highlight && <CoordinateGrid highlight={activeHighlight} highlightSeed={highlightSeed} />}
      {question.subjectKey && <p className="question-subject">{t(question.subjectKey)}</p>}
      <p className="question-prompt">{t(question.promptKey)}</p>

      <div className="question-options" dir={isDirectionalOptionSet(question.options, t) ? 'ltr' : undefined}>
        {question.options.map((option) => {
          const isCorrectOption = option.id === question.correctId;
          const isSelected = option.id === selectedOptionId;
          const stateClass = answered
            ? isCorrectOption
              ? 'is-correct'
              : isSelected
                ? 'is-incorrect'
                : ''
            : '';
          const label = option.labelKey ? t(option.labelKey) : option.labelText ?? '';
          const isGlyph = label.length <= 2;

          return (
            <button
              key={option.id}
              type="button"
              className={`question-option ${isGlyph ? 'question-option-glyph' : ''} ${stateClass}`}
              onClick={() => onSelect(option.id)}
              disabled={answered}
            >
              {option.labelKey ? label : <MathText>{label}</MathText>}
            </button>
          );
        })}
      </div>

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
