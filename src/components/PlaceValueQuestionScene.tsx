import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from './MathText';
import type { PlaceValueQuestion } from '../types/placeValue';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import './PlaceValueQuestionScene.css';

export type PlaceValueScenePhase = 'answering' | 'feedback' | 'retry';

interface PlaceValueQuestionSceneProps {
  question: PlaceValueQuestion;
  phase: PlaceValueScenePhase;
  lastRaw: string | null;
  lastCorrect: boolean | null;
  /** Correctness is always decided by `question.validate` — computed once, here. */
  onAnswer: (raw: string, isCorrect: boolean) => void;
}

/**
 * Renders any of the unit's four interaction kinds and reports an answer
 * the same way regardless of which one it is — every skill, the diagnostic
 * and the mock exam all go through this one component, which is what keeps
 * the whole unit one experience instead of eight separate UIs.
 *
 * Callers must render this keyed by `question.id` (`<PlaceValueQuestionScene
 * key={question.id} ... />`), the same convention the Algebra unit's custom
 * scenes use: a fresh question is a fresh mount, so typed/selected input
 * state resets automatically — nothing here resets it on its own, which
 * also means a selection made mid-feedback is never silently wiped.
 */
export function PlaceValueQuestionScene({ question, phase, lastRaw, lastCorrect, onAnswer }: PlaceValueQuestionSceneProps) {
  const { t } = useTranslation();
  const locked = phase === 'feedback';
  const answered = phase !== 'answering';

  function answer(raw: string) {
    if (locked) return;
    onAnswer(raw, question.validate(raw));
  }

  return (
    <div className="pv-scene">
      <p className={`pv-prompt${question.skillId === 'wordProblems' ? ' pv-prompt--story' : ''}`}>{t(question.promptKey, question.promptParams)}</p>
      {/* compareSymbol shows its own two numbers, constructChoice its own chips, and word
          problems carry everything in the prompt sentence — an empty hero line would just
          be a blank box, so it only renders when there is actually something to show. */}
      {question.display !== '' && <MathText className="pv-display">{question.display}</MathText>}

      {question.interaction.kind === 'multipleChoice' && (
        <MultipleChoiceInput options={question.interaction.options} validate={question.validate} locked={locked} lastRaw={lastRaw} answered={answered} onAnswer={answer} />
      )}
      {question.interaction.kind === 'numericInput' && (
        <NumericInput placeholderExample={question.interaction.placeholderExample} locked={locked} onAnswer={answer} />
      )}
      {question.interaction.kind === 'compareSymbol' && (
        <CompareSymbolInput
          left={question.interaction.left}
          right={question.interaction.right}
          validate={question.validate}
          locked={locked}
          lastRaw={lastRaw}
          answered={answered}
          onAnswer={answer}
        />
      )}
      {question.interaction.kind === 'constructChoice' && (
        <ConstructChoiceInput numbers={question.interaction.numbers} operations={question.interaction.operations} locked={locked} onAnswer={answer} />
      )}
      {question.interaction.kind === 'evenOddChoice' && (
        <EvenOddInput validate={question.validate} locked={locked} lastRaw={lastRaw} answered={answered} onAnswer={answer} />
      )}

      {answered && (
        <div className={`pv-feedback${lastCorrect ? ' is-correct' : ' is-wrong'}`} data-testid="pv-feedback">
          <p className="pv-feedback-verdict">{t(lastCorrect ? 'decimalExamPrep.common.correct' : 'decimalExamPrep.common.incorrect')}</p>
          <p className="pv-feedback-explanation">{t(question.explanationKey, question.explanationParams)}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Adapts `TrainingActivityScreen`'s generic `renderQuestion` contract to
 * this scene — the one piece of glue every skill page needs, written once.
 * Every skill page passes `hideBuiltinFeedback` to `TrainingActivityScreen`
 * (see that component), since this scene already shows its own verdict and
 * explanation; without it the engine's own generic feedback line would
 * duplicate it underneath.
 */
export function PlaceValueTrainingScene({ question, phase, lastAnswer, submit }: TrainingQuestionRenderProps<PlaceValueQuestion>) {
  return (
    <PlaceValueQuestionScene
      key={question.id}
      question={question.payload!}
      phase={phase === 'answering' ? 'answering' : phase === 'retry' ? 'retry' : 'feedback'}
      lastRaw={lastAnswer?.value ?? null}
      lastCorrect={lastAnswer?.isCorrect ?? null}
      onAnswer={(raw) => submit(raw)}
    />
  );
}

function MultipleChoiceInput({
  options,
  validate,
  locked,
  lastRaw,
  answered,
  onAnswer,
}: {
  options: string[];
  validate: (raw: string) => boolean;
  locked: boolean;
  lastRaw: string | null;
  answered: boolean;
  onAnswer: (raw: string) => void;
}) {
  return (
    <div className="pv-options">
      {options.map((option) => {
        const classes = ['pv-option'];
        if (answered) {
          if (validate(option)) classes.push('is-correct');
          else if (option === lastRaw) classes.push('is-wrong');
        }
        return (
          <button key={option} type="button" className={classes.join(' ')} data-testid={`pv-option-${option}`} disabled={locked} onClick={() => onAnswer(option)}>
            <MathText>{option}</MathText>
          </button>
        );
      })}
    </div>
  );
}

function NumericInput({ placeholderExample, locked, onAnswer }: { placeholderExample?: string; locked: boolean; onAnswer: (raw: string) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  function submit() {
    if (value.trim() === '') return;
    onAnswer(value.trim());
  }

  return (
    <div className="pv-numeric-row">
      <input
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*"
        className="pv-numeric-input"
        data-testid="pv-numeric-input"
        value={value}
        placeholder={placeholderExample}
        disabled={locked}
        dir="ltr"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
        }}
      />
      <button type="button" className="btn btn-primary pv-submit" data-testid="pv-submit" disabled={locked || value.trim() === ''} onClick={submit}>
        {t('decimalExamPrep.common.check')}
      </button>
    </div>
  );
}

function CompareSymbolInput({
  left,
  right,
  validate,
  locked,
  lastRaw,
  answered,
  onAnswer,
}: {
  left: string;
  right: string;
  validate: (raw: string) => boolean;
  locked: boolean;
  lastRaw: string | null;
  answered: boolean;
  onAnswer: (raw: string) => void;
}) {
  return (
    <div className="pv-compare">
      <MathText className="pv-compare-number">{left}</MathText>
      <div className="pv-compare-symbols">
        {(['<', '=', '>'] as const).map((symbol) => {
          const classes = ['pv-option', 'pv-symbol'];
          if (answered) {
            if (validate(symbol)) classes.push('is-correct');
            else if (symbol === lastRaw) classes.push('is-wrong');
          }
          return (
            <button key={symbol} type="button" className={classes.join(' ')} data-testid={`pv-symbol-${symbol}`} disabled={locked} onClick={() => onAnswer(symbol)}>
              {symbol}
            </button>
          );
        })}
      </div>
      <MathText className="pv-compare-number">{right}</MathText>
    </div>
  );
}

function EvenOddInput({
  validate,
  locked,
  lastRaw,
  answered,
  onAnswer,
}: {
  validate: (raw: string) => boolean;
  locked: boolean;
  lastRaw: string | null;
  answered: boolean;
  onAnswer: (raw: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="pv-options">
      {(['even', 'odd'] as const).map((parity) => {
        const classes = ['pv-option'];
        if (answered) {
          if (validate(parity)) classes.push('is-correct');
          else if (parity === lastRaw) classes.push('is-wrong');
        }
        return (
          <button key={parity} type="button" className={classes.join(' ')} data-testid={`pv-parity-${parity}`} disabled={locked} onClick={() => onAnswer(parity)}>
            {t(`decimalExamPrep.common.${parity}`)}
          </button>
        );
      })}
    </div>
  );
}

function ConstructChoiceInput({
  numbers,
  operations,
  locked,
  onAnswer,
}: {
  numbers: number[];
  operations: ('+' | '-')[];
  locked: boolean;
  onAnswer: (raw: string) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number[]>([]);
  const [operation, setOperation] = useState<'+' | '-' | null>(operations.length === 1 ? operations[0] : null);

  function toggleNumber(index: number) {
    if (locked) return;
    setSelected((current) => {
      if (current.includes(index)) return current.filter((value) => value !== index);
      if (current.length === 2) return current;
      return [...current, index];
    });
  }

  const canCheck = selected.length === 2 && operation !== null;

  function submit() {
    if (!canCheck) return;
    const [a, b] = selected.map((index) => numbers[index]);
    onAnswer(`${a}${operation}${b}`);
  }

  return (
    <div className="pv-construct">
      <div className="pv-chips">
        {numbers.map((value, index) => (
          <button
            key={index}
            type="button"
            className={`pv-chip${selected.includes(index) ? ' is-selected' : ''}`}
            data-testid={`pv-chip-${value}`}
            disabled={locked}
            onClick={() => toggleNumber(index)}
          >
            <MathText>{value}</MathText>
          </button>
        ))}
      </div>
      {operations.length > 1 && (
        <div className="pv-op-row">
          {operations.map((op) => (
            <button
              key={op}
              type="button"
              className={`pv-option pv-op${operation === op ? ' is-selected' : ''}`}
              data-testid={`pv-op-${op}`}
              disabled={locked}
              onClick={() => setOperation(op)}
            >
              {op}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="btn btn-primary pv-submit" data-testid="pv-submit" disabled={locked || !canCheck} onClick={submit}>
        {t('decimalExamPrep.common.check')}
      </button>
    </div>
  );
}
