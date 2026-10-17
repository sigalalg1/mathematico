import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { PlaceValueQuestionScene } from '../components/PlaceValueQuestionScene';
import { useDiagnosticSession, type DiagnosticResult } from '../training/useDiagnosticSession';
import { classifySkillStat, SKILL_I18N_PREFIX, SKILL_MIN_CONFIDENT_SAMPLE, SKILL_PATHS, type SkillStat } from '../utils/decimalExamPrepEngine';
import './DecimalExamPrepShared.css';

const UNIT_PATH = '/grade/4/decimal-place-value';

export function DecimalDiagnosticPage() {
  const { t } = useTranslation();
  const [runId, setRunId] = useState<number | null>(null);

  return (
    <PageLayout
      title={t('decimalDiagnostic.intro.title')}
      context={t('grades.4')}
      backTo={UNIT_PATH}
      backLabel={t('decimalExamPrepPage.title')}
      variant="game"
    >
      {runId === null ? (
        <DiagnosticIntro onStart={() => setRunId((id) => (id ?? 0) + 1)} />
      ) : (
        <DiagnosticRun key={runId} onRetake={() => setRunId((id) => (id ?? 0) + 1)} />
      )}
    </PageLayout>
  );
}

function DiagnosticIntro({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="dep-intro">
      <p className="dep-intro-description">{t('decimalDiagnostic.intro.description')}</p>
      <button type="button" className="btn btn-primary btn-cta" onClick={onStart}>
        {t('decimalDiagnostic.intro.startButton')}
      </button>
    </div>
  );
}

function DiagnosticRun({ onRetake }: { onRetake: () => void }) {
  const { question, index, total, phase, lastRaw, lastCorrect, result, submit } = useDiagnosticSession();

  if (result) return <DiagnosticResultsScreen result={result} onRetake={onRetake} />;

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

function DiagnosticResultsScreen({ result, onRetake }: { result: DiagnosticResult; onRetake: () => void }) {
  const { t } = useTranslation();
  // A 12-question diagnostic spread across 8 skills never samples any single
  // skill enough times to earn the strict `weak` classification (that needs
  // `SKILL_MIN_CONFIDENT_SAMPLE`, and no skill here gets more than 2
  // questions) — so recommending only "confidently weak" skills would never
  // recommend anything at all, regardless of how the student actually did.
  // Instead, recommend whichever answered skill(s) scored lowest, capped at
  // 3, with the accompanying note making clear this is a hint, not a verdict.
  const answeredStats = result.skillStats.filter((stat) => stat.total > 0);
  const worstAccuracy = answeredStats.length > 0 ? Math.min(...answeredStats.map((stat) => stat.correct / stat.total)) : 1;
  const weakSkills = worstAccuracy < 1 ? answeredStats.filter((stat) => stat.correct / stat.total === worstAccuracy).slice(0, 3) : [];
  const hasLowDataSkills = result.skillStats.some((stat) => stat.total > 0 && stat.total < SKILL_MIN_CONFIDENT_SAMPLE);
  const overallPercent = result.overallTotal > 0 ? Math.round((result.overallCorrect / result.overallTotal) * 100) : 0;

  return (
    <div className="dep-results">
      <h2 className="dep-section-heading">{t('decimalDiagnostic.results.title')}</h2>

      <div className="dep-overall">
        <span className="dep-overall-label">{t('decimalDiagnostic.results.overallLabel')}</span>
        <span className="dep-overall-value" dir="ltr">
          {result.overallCorrect}/{result.overallTotal} ({overallPercent}%)
        </span>
      </div>

      <section>
        <h3 className="dep-section-heading">{t('decimalDiagnostic.results.skillsHeading')}</h3>
        <SkillGrid stats={result.skillStats} />
        {hasLowDataSkills && <p className="dep-note">{t('decimalDiagnostic.results.lowDataNote')}</p>}
      </section>

      <section className="dep-recommendation">
        <h3 className="dep-section-heading">{t('decimalDiagnostic.results.recommendationHeading')}</h3>
        {weakSkills.length === 1 ? (
          <p>{t('decimalDiagnostic.results.recommendationWeak', { skill: t(`${SKILL_I18N_PREFIX[weakSkills[0].skillId]}.gameName`) })}</p>
        ) : weakSkills.length > 1 ? (
          <p>
            {t('decimalDiagnostic.results.recommendationMixed', {
              skills: weakSkills.map((stat) => t(`${SKILL_I18N_PREFIX[stat.skillId]}.gameName`)).join(', '),
            })}
          </p>
        ) : (
          <p>{t('decimalDiagnostic.results.recommendationAllGood')}</p>
        )}
        {weakSkills[0] && (
          <Link className="btn btn-primary" to={SKILL_PATHS[weakSkills[0].skillId]}>
            {t('decimalDiagnostic.results.practiceButton')}
          </Link>
        )}
      </section>

      <div className="dep-actions">
        <button type="button" className="btn btn-secondary" onClick={onRetake}>
          {t('decimalDiagnostic.results.retakeButton')}
        </button>
        <Link className="btn btn-secondary" to={`${UNIT_PATH}/mock-exam`}>
          {t('decimalDiagnostic.results.mockExamButton')}
        </Link>
        <Link className="btn btn-ghost" to={UNIT_PATH}>
          {t('decimalDiagnostic.results.backButton')}
        </Link>
      </div>
    </div>
  );
}

export function SkillGrid({ stats }: { stats: SkillStat[] }) {
  const { t } = useTranslation();
  return (
    <div className="dep-skill-grid">
      {stats.map((stat) => {
        const status = classifySkillStat(stat);
        const percent = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        return (
          <div key={stat.skillId} className="dep-skill-row" data-status={status}>
            <div className="dep-skill-row-top">
              <span className="dep-skill-name">{t(`${SKILL_I18N_PREFIX[stat.skillId]}.gameName`)}</span>
              <span className="dep-skill-score" dir="ltr">
                {stat.total > 0 ? `${stat.correct}/${stat.total}` : '—'}
              </span>
            </div>
            <div className="dep-skill-bar">
              <div className="dep-skill-bar-fill" style={{ width: `${stat.total > 0 ? percent : 0}%` }} />
            </div>
            <span className="dep-skill-badge">{t(`decimalExamPrep.skillStatus.${status}`)}</span>
          </div>
        );
      })}
    </div>
  );
}
