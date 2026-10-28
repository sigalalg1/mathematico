import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MathText } from '../components/MathText';
import { VertexSceneView } from '../components/geometry/VertexSceneView';
import { PageLayout } from '../components/PageLayout';
import { grade7GeometryStyle } from '../geometry/style';
import { buildAnglesQuickRecapQuestions } from '../data/games/anglesQuickRecapData';
import type { QuickRecapQuestion } from '../types/anglesGrade7';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import type { ActivityMistake } from '../types/activity';
import './AnglesGrade7Shared.css';
import './AnglesQuickRecapPage.css';

const GEOMETRY_PATH = '/grade/7/geometry';
const GAME_ID = 'anglesQuickRecap';

/** App-controlled feedback beats, excluded from nothing here — this is a light trivia round, not a timed/measured training session. */
const CORRECT_FEEDBACK_MS = 900;
const WRONG_FEEDBACK_MS = 2200;

type Phase = 'answering' | 'feedback' | 'completed';

interface AnsweredRecord {
  questionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

/**
 * "Quick Recap" — a short, playful, ten-question, mixed-topic review of
 * everything already covered in the Grade 7 Angles unit (own build; see
 * `anglesQuickRecapData` for why this is deliberately a lighter, no-setup,
 * fixed-length flow rather than another `TrainingActivityScreen` activity
 * with difficulty tiers and personal records).
 */
export function AnglesQuickRecapPage() {
  const { t } = useTranslation();
  const [roundKey, setRoundKey] = useState(0);
  // `roundKey` is a deliberate cache-bust trigger (not read inside the
  // callback) — "play again" bumps it so a fresh, re-randomized round is
  // generated instead of replaying the exact same questions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => buildAnglesQuickRecapQuestions(), [roundKey]);
  const total = questions.length;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnsweredRecord[]>([]);

  const question = questions[index];
  const completed = phase === 'completed';
  const score = answers.filter((a) => a.isCorrect).length;
  const mistakes: ActivityMistake[] = answers
    .filter((a) => !a.isCorrect)
    .map((a) => ({ questionId: a.questionId, selectedAnswer: a.selectedAnswer, correctAnswer: a.correctAnswer }));

  useGameSessionTracking(GAME_ID, { total, score, completed, mistakes, roundKey });

  const submit = useCallback(
    (value: string) => {
      if (phase !== 'answering') return;
      const isCorrect = value === question.answer;
      setSelected(value);
      setAnswers((previous) => [...previous, { questionId: question.id, selectedAnswer: value, correctAnswer: question.answer, isCorrect }]);
      setPhase('feedback');
    },
    [phase, question],
  );

  useEffect(() => {
    if (phase !== 'feedback') return undefined;
    const isCorrect = selected === question.answer;
    const timer = window.setTimeout(
      () => {
        if (index + 1 >= total) {
          setPhase('completed');
        } else {
          setIndex((previous) => previous + 1);
          setSelected(null);
          setPhase('answering');
        }
      },
      isCorrect ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, selected, question, index, total]);

  const playAgain = useCallback(() => {
    setRoundKey((previous) => previous + 1);
    setIndex(0);
    setPhase('answering');
    setSelected(null);
    setAnswers([]);
  }, []);

  return (
    <PageLayout
      title={t('anglesGrade7.quickRecap.gameName')}
      subtitle={t('anglesGrade7.quickRecap.intro')}
      context={t('grades.7')}
      backTo={GEOMETRY_PATH}
      backLabel={t('geometryGrade7Page.title')}
      variant="game"
    >
      {completed ? (
        <QuickRecapResults score={score} total={total} onPlayAgain={playAgain} />
      ) : (
        <>
          <div className="quick-recap-progress" data-testid="quick-recap-progress">
            <span className="quick-recap-progress-label">{t('anglesGrade7.quickRecap.progressLabel', { current: index + 1, total })}</span>
            <div className="quick-recap-progress-bar">
              <div className="quick-recap-progress-fill" style={{ width: `${((index + (phase !== 'answering' ? 1 : 0)) / total) * 100}%` }} />
            </div>
          </div>
          <QuickRecapQuestionView key={question.id} question={question} phase={phase} selected={selected} onSubmit={submit} />
        </>
      )}
    </PageLayout>
  );
}

function QuickRecapResults({ score, total, onPlayAgain }: { score: number; total: number; onPlayAgain: () => void }) {
  const { t } = useTranslation();
  return (
    <section className="quick-recap-results" data-testid="quick-recap-results">
      <p className="quick-recap-results-title">{t('anglesGrade7.quickRecap.results.title')}</p>
      <p className="quick-recap-results-score">{t('anglesGrade7.quickRecap.results.scoreLine', { score, total })}</p>
      <div className="quick-recap-results-actions">
        <button type="button" className="angles7-check-button" onClick={onPlayAgain} data-testid="quick-recap-play-again">
          {t('anglesGrade7.quickRecap.results.playAgain')}
        </button>
        <Link className="quick-recap-results-link" to={GEOMETRY_PATH} data-testid="quick-recap-back-to-topic">
          {t('anglesGrade7.quickRecap.results.backToTopic')}
        </Link>
      </div>
    </section>
  );
}

interface QuestionViewProps {
  question: QuickRecapQuestion;
  phase: Phase;
  selected: string | null;
  onSubmit: (value: string) => void;
}

function QuickRecapQuestionView({ question, phase, selected, onSubmit }: QuestionViewProps) {
  const { t } = useTranslation();
  const answered = phase === 'feedback';
  const prompt = t(question.promptKey, question.promptValues ?? {});

  const renderOptionLabel = (option: string) => {
    switch (question.optionRender) {
      case 'label':
        return t(`anglesGrade7.quickRecap.optionLabels.${option}`);
      case 'angleType':
        return t(`anglesGrade7.types.typeLabel.${option}`);
      case 'angleName':
        return <MathText>{`∠${option}`}</MathText>;
      case 'compareSymbol':
        return <MathText>{option}</MathText>;
      case 'degrees':
        return <MathText>{`${option}°`}</MathText>;
      default:
        return option;
    }
  };

  return (
    <section className="angles7-scene quick-recap-scene" data-kind={question.topic} data-testid="quick-recap-question">
      <p className="angles7-prompt">{prompt}</p>

      {question.topic === 'compare' ? (
        <div className="angles7-compare-row quick-recap-compare-row">
          <div className="angles7-compare-side">
            <VertexSceneView
              scene={question.compare!.left.scene}
              style={grade7GeometryStyle}
              label={prompt}
              showRayLabels={false}
              angles={[{ id: 'left', ref: question.compare!.left.ref, filled: true }]}
            />
          </div>
          <div className="angles7-compare-sign">?</div>
          <div className="angles7-compare-side">
            <VertexSceneView
              scene={question.compare!.right.scene}
              style={grade7GeometryStyle}
              label={prompt}
              showRayLabels={false}
              angles={[{ id: 'right', ref: question.compare!.right.ref, colorIndex: 1, filled: true }]}
            />
          </div>
        </div>
      ) : (
        <VertexSceneView
          scene={question.scene!}
          style={grade7GeometryStyle}
          label={prompt}
          showRayLabels={question.topic !== 'measure'}
          showVertexLabel={question.topic !== 'measure'}
          angles={question.highlightedRef ? [{ id: 'highlighted', ref: question.highlightedRef, colorIndex: 0, filled: question.topic === 'types' }] : []}
          protractor={question.protractorBaselineRayId ? { baselineRayId: question.protractorBaselineRayId } : undefined}
        />
      )}

      <div className={`angles7-options${question.optionRender === 'compareSymbol' ? ' quick-recap-options-ltr' : ''}`}>
        {question.options.map((option) => {
          const state = answered && option === question.answer ? ' is-correct' : answered && option === selected ? ' is-wrong' : '';
          return (
            <button
              key={option}
              type="button"
              className={`angles7-option${state}`}
              disabled={answered}
              onClick={() => onSubmit(option)}
              data-testid="quick-recap-option"
            >
              {renderOptionLabel(option)}
            </button>
          );
        })}
      </div>

      {answered && (
        <p className={`angles7-feedback ${selected === question.answer ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite" data-testid="quick-recap-feedback">
          {t(selected === question.answer ? 'training.feedback.correct' : question.feedbackKey)}
        </p>
      )}
    </section>
  );
}
