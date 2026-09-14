import type { VocabularyQuestion } from '../../types/vocabularyQuiz';
import type { QuizAnswerStatus } from '../../types/quiz';
import { ChoiceQuestionView } from './ChoiceQuestionView';
import { GridTargetQuestionView } from './GridTargetQuestionView';

interface VocabularyQuestionRendererProps {
  question: VocabularyQuestion;
  selectedId: string | null;
  status: QuizAnswerStatus;
  highlightSeed: number;
  onSelect: (id: string) => void;
}

export function VocabularyQuestionRenderer({
  question,
  selectedId,
  status,
  highlightSeed,
  onSelect,
}: VocabularyQuestionRendererProps) {
  if (question.kind === 'gridTarget') {
    return (
      <GridTargetQuestionView
        question={question}
        selectedTargetId={selectedId}
        status={status}
        highlightSeed={highlightSeed}
        onSelect={onSelect}
      />
    );
  }

  return (
    <ChoiceQuestionView
      question={question}
      selectedOptionId={selectedId}
      status={status}
      highlightSeed={highlightSeed}
      onSelect={onSelect}
    />
  );
}
