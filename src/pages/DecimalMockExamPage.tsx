import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { MathText } from '../components/MathText';
import { PlaceValueQuestionScene } from '../components/PlaceValueQuestionScene';
import { useMockExamSession, type MockExamResult } from '../training/useMockExamSession';
import { useAuth } from '../auth/useAuth';
import { getReadinessAssessment, saveMockExamResult } from '../tracking/decimalExamPrepStore';
import { SkillGrid } from './DecimalDiagnosticPage';
import type { PlaceValueQuestion } from '../types/placeValue';
import './DecimalExamPrepShared.css';

const UNIT_PATH = '/grade/4/decimal-place-value';

/**
 * `question.display` is deliberately empty for `compareSymbol` questions
 * (the live scene shows the two numbers as its own chips, not a hero line —
 * see `PlaceValueQuestionScene`) — but the review list has no scene to fall
 * back on, so without this a missed comparison would show no numbers at
 * all, just the `<`/`>` symbols with nothing to compare them against.
 */
function reviewDisplay(question: PlaceValueQuestion): string {
  if (question.display) return question.display;
  if (question.interaction.kind === 'compareSymbol') return `${question.interaction.left}   ${question.interaction.right}`;
  return '';
}

export function DecimalMockExamPage() {
  const { t } = useTranslation();
  const [runId, setRunId] = useState<number | null>(null);

  return (
    <PageLayout
      title={t('decimalMockExam.intro.title')}
      context={t('grades.4')}
      backTo={UNIT_PATH}
      backLabel={t('decimalExamPrepPage.title')}
      variant="game"
    >
      {runId === null ? (
        <MockExamIntro onStart={() => setRunId((id) => (id ?? 0) + 1)} />
      ) : (
        <MockExamRun key={runId} onRegenerate={() => setRunId((id) => (id ?? 0) + 1)} />
      )}
    </PageLayout>
  );
}

function MockExamIntro({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="dep-intro">
      <p className="dep-intro-description">{t('decimalMockExam.intro.description')}</p>
      <button type="button" className="btn btn-primary btn-cta" onClick={onStart}>
        {t('decimalMockExam.intro.startButton')}
      </button>
    </div>
  );
}

function MockExamRun({ onRegenerate }: { onRegenerate: () => void }) {
  const { question, index, total, phase, lastRaw, lastCorrect, result, submit } = useMockExamSession();
  const { user } = useAuth();

  useEffect(() => {
    if (!result) return;
    saveMockExamResult(user?.id ?? null, {
      takenAt: new Date().toISOString(),
      overallCorrect: result.overallCorrect,
      overallTotal: result.overallTotal,
      skillStats: result.skillStats,
    });
    // Save once, the moment a result appears for this run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (result) return <MockExamResultsScreen result={result} onRegenerate={onRegenerate} />;

  return (
    <>
      <QuizProgress current={index + 1} total={total} />
      <PlaceValueQuestionScene
        key={question.id}
        question={question}
        phase={phase === 'answering' ? 'answering' : 'feedback'}
        lastRaw={lastRaw}
        lastCorrect={lastCorrect}
        onAnswer={(raw) => submit(raw)}
      />
    </>
  );
}

function MockExamResultsScreen({ result, onRegenerate }: { result: MockExamResult; onRegenerate: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const overallPercent = result.overallTotal > 0 ? Math.round((result.overallCorrect / result.overallTotal) * 100) : 0;
  const readiness = getReadinessAssessment(user?.id ?? null);
  const incorrectAnswers = result.answers.filter((answer) => !answer.correct);

  const readinessMessageKey =
    readiness.status === 'ready'
      ? 'decimalMockExam.results.readinessReady'
      : readiness.status === 'notYet'
        ? 'decimalMockExam.results.readinessNotYet'
        : 'decimalMockExam.results.readinessNotEnoughAttempts';

  return (
    <div className="dep-results">
      <h2 className="dep-section-heading">{t('decimalMockExam.results.title')}</h2>

      <div className="dep-overall">
        <span className="dep-overall-label">{t('decimalMockExam.results.overallLabel')}</span>
        <span className="dep-overall-value" dir="ltr">
          {result.overallCorrect}/{result.overallTotal} ({overallPercent}%)
        </span>
      </div>

      <section className="dep-recommendation">
        <h3 className="dep-section-heading">{t('decimalMockExam.results.readinessHeading')}</h3>
        <p>{t(readinessMessageKey)}</p>
      </section>

      <section>
        <h3 className="dep-section-heading">{t('decimalMockExam.results.skillsHeading')}</h3>
        <SkillGrid stats={result.skillStats} />
      </section>

      {incorrectAnswers.length > 0 && (
        <section>
          <h3 className="dep-section-heading">{t('decimalMockExam.results.reviewHeading')}</h3>
          <div className="dep-review-list">
            {incorrectAnswers.map((answer) => (
              <div key={answer.question.id} className="dep-review-item">
                <span className="dep-review-prompt">{t(answer.question.promptKey, answer.question.promptParams)}</span>
                <MathText>{reviewDisplay(answer.question)}</MathText>
                {/* Only the numbers are LTR-isolated, not the whole line — the Hebrew
                    labels around them must stay in natural RTL reading order. */}
                <span className="dep-review-answers">
                  {t('decimalMockExam.results.reviewYourAnswer')}: <span dir="ltr">{answer.raw}</span> ·{' '}
                  {t('decimalMockExam.results.reviewCorrectAnswer')}: <span dir="ltr">{answer.question.correctAnswerDisplay}</span>
                </span>
                <span className="dep-review-explanation">{t(answer.question.explanationKey, answer.question.explanationParams)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="dep-actions">
        <button type="button" className="btn btn-secondary" onClick={onRegenerate}>
          {t('decimalMockExam.results.regenerateButton')}
        </button>
        <Link className="btn btn-ghost" to={UNIT_PATH}>
          {t('decimalMockExam.results.backButton')}
        </Link>
      </div>
    </div>
  );
}
