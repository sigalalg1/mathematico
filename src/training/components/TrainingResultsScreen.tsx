import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MathText } from '../../components/MathText';
import type {
  TrainingImprovement,
  TrainingMode,
  TrainingPersonalBest,
  TrainingSessionResult,
} from '../../types/training';
import { accuracyPercent, formatDuration, secondsPerQuestion } from '../metrics';
import './TrainingActivity.css';

interface TrainingResultsScreenProps {
  result: TrainingSessionResult;
  mode: TrainingMode;
  /** `null` in practice mode and until a challenge result has been compared. */
  improvement: TrainingImprovement | null;
  /** Bests including the session just played — shown as "what to beat next time". */
  personalBest: TrainingPersonalBest | null;
  onRetrySameConfiguration: () => void;
  onChangeSettings: () => void;
  backTo: string;
  backLabel: string;
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="tr-stat">
      <span className="tr-stat-label">{label}</span>
      <MathText className="tr-stat-value">{value}</MathText>
      {detail && <span className="tr-stat-detail">{detail}</span>}
    </div>
  );
}

/**
 * The one results screen every training activity uses.
 *
 * Accuracy, pace and streak are three separate numbers and stay that way —
 * there is no combined score. Records are celebrated only when something was
 * genuinely beaten; otherwise the result is simply shown next to what there is
 * to aim at next time.
 */
export function TrainingResultsScreen({
  result,
  mode,
  improvement,
  personalBest,
  onRetrySameConfiguration,
  onChangeSettings,
  backTo,
  backLabel,
}: TrainingResultsScreenProps) {
  const { t } = useTranslation();
  const isChallenge = mode === 'challenge';

  const records: string[] = [];
  if (improvement?.accuracy.isRecord) {
    records.push(t('training.results.record.accuracy', { percent: accuracyPercent(result.accuracy) }));
  }
  if (improvement?.pace.isRecord && improvement.pace.improvement !== null) {
    const margin = secondsPerQuestion(improvement.pace.improvement);
    // A gain too small to show as a number is still a record, but claiming an
    // "improvement of 0 seconds" would read as empty hype.
    records.push(
      margin > 0
        ? t('training.results.record.pace', {
            seconds: secondsPerQuestion(result.averageMsPerQuestion),
            improvement: margin,
          })
        : t('training.results.record.paceNarrow', { seconds: secondsPerQuestion(result.averageMsPerQuestion) }),
    );
  }
  if (improvement?.streak.isRecord) {
    records.push(t('training.results.record.streak', { value: result.longestStreak }));
  }

  return (
    <div className="tr-results" data-testid="tr-results">
      <h2 className="tr-results-title">
        {t(isChallenge ? 'training.results.challengeTitle' : 'training.results.practiceTitle')}
      </h2>

      <div className="tr-stats">
        <Stat
          label={t('training.results.accuracyLabel')}
          value={`${result.correctCount}/${result.totalQuestions}`}
          detail={t('training.results.accuracyDetail', { percent: accuracyPercent(result.accuracy) })}
        />
        {isChallenge && (
          <Stat
            label={t('training.results.paceLabel')}
            // Number and unit are split so the three tiles read alike and the
            // unit never wraps down the middle of a narrow phone column.
            value={String(secondsPerQuestion(result.averageMsPerQuestion))}
            detail={t('training.results.paceUnit')}
          />
        )}
        <Stat
          label={t('training.results.streakLabel')}
          value={String(result.longestStreak)}
          detail={t('training.results.streakDetail')}
        />
      </div>

      {/* Total time is context, not a result: one quiet line under the three
          figures that actually matter, and only where time is part of the game. */}
      {isChallenge && (
        <p className="tr-total-time" data-testid="tr-total-time">
          {t('training.results.totalTime', { time: formatDuration(result.totalDurationMs) })}
        </p>
      )}

      {result.accuracy === 1 && <p className="tr-perfect">{t('training.results.perfect', { total: result.totalQuestions })}</p>}

      {isChallenge && improvement && (
        <section className="tr-improvement" data-testid="tr-improvement">
          {improvement.isFirstAttempt ? (
            <p className="tr-baseline">{t('training.results.firstAttempt')}</p>
          ) : records.length > 0 ? (
            <ul className="tr-records">
              {records.map((line) => (
                <li key={line} className="tr-record">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="tr-neutral">{t('training.results.noNewRecords')}</p>
          )}

          {!improvement.pace.isEligible && (
            <p className="tr-note">{t('training.results.paceNeedsPerfect')}</p>
          )}

          {personalBest && !improvement.isFirstAttempt && (
            <dl className="tr-bests">
              <div className="tr-best">
                <dt>{t('training.results.bestAccuracy')}</dt>
                <dd>
                  <MathText>{`${accuracyPercent(personalBest.bestAccuracy)}%`}</MathText>
                </dd>
              </div>
              {personalBest.bestAverageMsPerQuestion !== null && (
                <div className="tr-best">
                  <dt>{t('training.results.bestPace')}</dt>
                  <dd>
                    {t('training.results.paceValue', {
                      seconds: secondsPerQuestion(personalBest.bestAverageMsPerQuestion),
                    })}
                  </dd>
                </div>
              )}
              <div className="tr-best">
                <dt>{t('training.results.bestStreak')}</dt>
                <dd>
                  <MathText>{String(personalBest.bestLongestStreak)}</MathText>
                </dd>
              </div>
            </dl>
          )}
        </section>
      )}

      <div className="tr-results-actions">
        <button type="button" className="btn btn-primary tr-again" onClick={onRetrySameConfiguration}>
          {t(isChallenge ? 'training.actions.tryAgainSame' : 'training.actions.practiceAgain')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onChangeSettings}>
          {t('training.actions.changeSettings')}
        </button>
        <Link className="btn btn-ghost tr-back" to={backTo}>
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
