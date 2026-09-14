import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { QuizCompletion } from '../components/quiz/QuizCompletion';
import { TeachCard } from '../components/quiz/TeachCard';
import { VocabularyQuestionRenderer } from '../components/quiz/VocabularyQuestionRenderer';
import { useQuizRound } from '../hooks/useQuizRound';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import {
  VOCABULARY_PRACTICE_ROUND_SIZE,
  shuffleVocabularyQuestion,
  vocabularyQuestionPool,
} from '../data/vocabulary/questionPool';
import { teachSteps } from '../data/vocabulary/teachSteps';
import { hasSeenVocabularyIntro, markVocabularyIntroSeen } from '../data/vocabulary/introProgress';
import './CoordinateVocabularyPage.css';

const GAME_ID = 'coordinateVocabulary';

export function CoordinateVocabularyPage() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'learn' | 'practice'>(() => (hasSeenVocabularyIntro() ? 'practice' : 'learn'));
  const [teachIndex, setTeachIndex] = useState(0);

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
    pool: vocabularyQuestionPool,
    count: VOCABULARY_PRACTICE_ROUND_SIZE,
    getId: (item) => item.id,
    getCorrectId: (item) => item.correctId,
    shuffleItem: shuffleVocabularyQuestion,
  });

  useGameSessionTracking(GAME_ID, { total, score, completed, mistakes, roundKey }, phase === 'practice');

  function handleTeachContinue() {
    if (teachIndex === teachSteps.length - 1) {
      markVocabularyIntroSeen();
      setPhase('practice');
      return;
    }
    setTeachIndex((value) => value + 1);
  }

  const isLastQuestion = index === total - 1;

  return (
    <PageLayout title={t('vocabulary.gameName')} backTo="/grade/7/coordinate-system" backLabel={t('coordinateSystemPage.title')}>
      {phase === 'learn' ? (
        <div className="coordinate-vocabulary">
          <QuizProgress current={teachIndex + 1} total={teachSteps.length} labelKey="quiz.learnLabel" />
          <TeachCard step={teachSteps[teachIndex]} onContinue={handleTeachContinue} />
        </div>
      ) : completed ? (
        <QuizCompletion score={score} total={total} onRetry={retry} />
      ) : (
        <div className="coordinate-vocabulary">
          <QuizProgress current={index + 1} total={total} />
          <VocabularyQuestionRenderer
            question={question}
            selectedId={selectedId}
            status={status}
            highlightSeed={attempt}
            onSelect={select}
          />
          {status !== 'unanswered' && (
            <div className="coordinate-vocabulary-controls">
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
