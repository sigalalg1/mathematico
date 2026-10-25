import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import { classifySignRule, expressionSteps, signRulesActivity } from '../data/games/signRulesData';
import type { SignRuleQuestionPayload } from '../types/signRules';
import './SignedNumbersShared.css';

const SIGNED_NUMBERS_PATH = '/grade/7/signed-numbers';

export function SignRulesPage() {
  const { t } = useTranslation();
  const [discoveryStep, setDiscoveryStep] = useState(0);

  if (discoveryStep >= 3) {
    return (
      <TrainingActivityScreen
        activity={signRulesActivity}
        titleKey="signRules.gameName"
        contextLabel={t('grades.7')}
        backTo={SIGNED_NUMBERS_PATH}
        backLabel={t('signedNumbersPage.title')}
        promptKey="signRules.prompt"
        renderQuestion={(props) => <SignRuleQuestion {...props} />}
      />
    );
  }

  return (
    <PageLayout
      title={t('signRules.gameName')}
      context={t('grades.7')}
      backTo={SIGNED_NUMBERS_PATH}
      backLabel={t('signedNumbersPage.title')}
      variant="game"
    >
      <div className="signed-discovery">
        <div
          className="signed-discovery-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={discoveryStep + 1}
          aria-label={t('signRules.discovery.progress', { current: discoveryStep + 1 })}
        >
          {t('signRules.discovery.progress', { current: discoveryStep + 1 })}
        </div>
        <p className="signed-activity-prompt">{t(`signRules.discovery.step${discoveryStep + 1}.title`)}</p>
        {discoveryStep === 0 && (
          <Pattern
            rows={['3 × 4 = 12', '2 × 4 = 8', '1 × 4 = 4', '0 × 4 = 0', '(−1) × 4 = −4', '(−2) × 4 = −8', '(−3) × 4 = −12']}
            note={t('signRules.discovery.step1.note')}
          />
        )}
        {discoveryStep === 1 && (
          <Pattern
            rows={['3 × (−4) = −12', '2 × (−4) = −8', '1 × (−4) = −4', '0 × (−4) = 0', '(−1) × (−4) = 4', '(−2) × (−4) = 8']}
            note={t('signRules.discovery.step2.note')}
          />
        )}
        {discoveryStep === 2 && <RuleSummary />}
        <button type="button" className="btn btn-primary" onClick={() => setDiscoveryStep((step) => step + 1)}>
          {discoveryStep === 2 ? t('signRules.discovery.startPractice') : t('signRules.discovery.continue')}
        </button>
      </div>
    </PageLayout>
  );
}

function Pattern({ rows, note }: { rows: string[]; note: string }) {
  return (
    <div className="signed-pattern">
      {rows.map((row, index) => (
        <MathText key={row} className={`signed-pattern-row${index >= rows.length - 2 ? ' is-new' : ''}`}>
          {row}
        </MathText>
      ))}
      <p className="signed-pattern-note">{note}</p>
    </div>
  );
}

function RuleSummary() {
  const { t } = useTranslation();
  return (
    <div className="signed-rule-summary">
      <p className="signed-rule-main">{t('signRules.discovery.rule')}</p>
      {['3 × 4 = 12', '(−3) × (−4) = 12', '(−3) × 4 = −12', '3 × (−4) = −12'].map((example) => (
        <MathText key={example} className="signed-rule-example">{example}</MathText>
      ))}
    </div>
  );
}

function SignRuleQuestion({
  question,
  phase,
  lastAnswer,
  submit,
}: TrainingQuestionRenderProps<SignRuleQuestionPayload>) {
  const { t } = useTranslation();
  const payload = question.payload!;
  const wrong = (phase === 'feedback' || phase === 'retry') && lastAnswer && !lastAnswer.isCorrect;
  const steps = (phase === 'feedback' || phase === 'retry') ? expressionSteps(payload) : [];

  return (
    <div className="signed-training-question">
      <p className="tr-prompt">{t(`signRules.questionPrompt.${payload.type}`)}</p>
      <MathText className="tr-fact">{question.prompt}{payload.type === 'signOnly' || payload.type === 'signFirst' ? '' : ' = ?'}</MathText>
      {payload.type === 'inverseDivision' && (
        <p className="signed-inverse-note">{t('signRules.inverseNote')}</p>
      )}
      <div className="tr-options">
        {question.options.map((option) => {
          const classes = ['tr-option'];
          if (phase === 'feedback' && lastAnswer) {
            if (option === lastAnswer.correctAnswer) classes.push('tr-option-correct');
            else if (option === lastAnswer.value) classes.push('tr-option-wrong');
          }
          return (
            <button
              key={option}
              type="button"
              className={classes.join(' ')}
              disabled={phase === 'feedback'}
              onClick={() => submit(option)}
            >
              <MathText>{option === 'positive' || option === 'negative' ? t(`signRules.sign.${option}`) : option}</MathText>
            </button>
          );
        })}
      </div>
      {wrong && payload.type !== 'signFirst' && payload.type !== 'signOnly' && (
        <p className="signed-diagnostic feedback-hint-text">
          {t(`signRules.feedback.${classifySignRule(payload, lastAnswer.value)}`)}
        </p>
      )}
      {steps.length > 0 && (
        <div className="signed-expression-steps">
          {steps.map((step) => <MathText key={step}>{step}</MathText>)}
        </div>
      )}
    </div>
  );
}
