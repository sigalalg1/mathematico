import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
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
  /**
   * Lets a child move on without eventually getting a retried question
   * right — rendered as a "skip" option only while `phase === 'retry'`.
   * Omitted entirely for the diagnostic and mock exam, which never retry in
   * the first place (a wrong first answer there already moves on by
   * itself), so there is nothing to skip past.
   */
  onSkip?: () => void;
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
export function PlaceValueQuestionScene({ question, phase, lastRaw, lastCorrect, onAnswer, onSkip }: PlaceValueQuestionSceneProps) {
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
          be a blank box, so it only renders when there is actually something to show.
          A vertical arithmetic question renders its display AND its answer input as one
          combined column layout (see `VerticalArithmeticInput`), so it is handled first
          and skips both the generic display line and the generic numericInput below. */}
      {question.displayMode === 'vertical' && question.interaction.kind === 'numericInput' ? (
        <VerticalArithmeticInput display={question.display} locked={locked} onAnswer={answer} />
      ) : (
        <>
          {question.display !== '' && <MathText className="pv-display">{question.display}</MathText>}
          {question.interaction.kind === 'numericInput' && (
            <NumericInput placeholderExample={question.interaction.placeholderExample} locked={locked} onAnswer={answer} />
          )}
        </>
      )}

      {question.interaction.kind === 'multipleChoice' && (
        <MultipleChoiceInput options={question.interaction.options} validate={question.validate} locked={locked} lastRaw={lastRaw} answered={answered} onAnswer={answer} />
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
          {phase === 'retry' && onSkip && (
            <button type="button" className="btn btn-ghost pv-skip" data-testid="pv-skip" onClick={onSkip}>
              {t('decimalExamPrep.common.skipQuestion')}
            </button>
          )}
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
export function PlaceValueTrainingScene({ question, phase, lastAnswer, submit, advance }: TrainingQuestionRenderProps<PlaceValueQuestion>) {
  return (
    <PlaceValueQuestionScene
      key={question.id}
      question={question.payload!}
      phase={phase === 'answering' ? 'answering' : phase === 'retry' ? 'retry' : 'feedback'}
      lastRaw={lastAnswer?.value ?? null}
      lastCorrect={lastAnswer?.isCorrect ?? null}
      onAnswer={(raw) => submit(raw)}
      onSkip={advance}
    />
  );
}

/**
 * Column addition/subtraction — digits right-aligned by place, a scratch row
 * above for carry/borrow marks, a rule under the operands, and the answer
 * typed digit by digit directly beneath it — the way a Grade 4 student
 * actually works a regrouping problem on paper, instead of a flat
 * "12,805 − 4,588" line with a single free-text box underneath that offers
 * no visual help lining up the places to carry or borrow between.
 *
 * `display` must be exactly `"A + B"` or `"A − B"` (as every
 * `displayMode: 'vertical'` question's generator produces) — the two operand
 * strings are shown as-is (already comma-formatted), never re-parsed into
 * numbers; only their digit *count* (for sizing the answer/scratch rows) is
 * ever extracted. The scratch row is pure, ungraded working space — never
 * read by `onAnswer` — since checking it would mean validating a specific
 * regrouping *method*, not just the final answer.
 */
/** Right-pads a digit array up to `total` cells with leading blanks, so every row in the grid has the exact same cell count. */
function padToColumns(digits: string[], total: number): string[] {
  const blanks = Array<string>(Math.max(0, total - digits.length)).fill('');
  return [...blanks, ...digits];
}

/**
 * A thousands-group boundary falls before column `index` (counting from the
 * most significant column) when there are a multiple of 3 columns left
 * after it — the same grouping a comma marks in the horizontal form, drawn
 * here as spacing instead, since a literal comma glyph has no consistent
 * width relative to a digit and would break the grid it sits in.
 */
function startsNewGroup(index: number, total: number): boolean {
  const fromEnd = total - index;
  return index > 0 && fromEnd % 3 === 0;
}

function VerticalArithmeticInput({ display, locked, onAnswer }: { display: string; locked: boolean; onAnswer: (raw: string) => void }) {
  const match = /^(.+) ([+−]) (.+)$/.exec(display);
  const operator = match?.[2] ?? '+';
  const leftDigits = (match?.[1] ?? '').replace(/\D/g, '').split('');
  const rightDigits = (match?.[3] ?? '').replace(/\D/g, '').split('');
  // Addition can gain one extra leading digit over its widest operand (e.g.
  // 75,512 + 36,799 = 112,311); subtraction never exceeds the minuend's own
  // digit count. Either way the column count comes from what the student can
  // already see in the operands, never from the answer itself.
  const digitColumns = Math.max(leftDigits.length, rightDigits.length);
  const totalColumns = operator === '+' ? digitColumns + 1 : digitColumns;
  const leftCells = padToColumns(leftDigits, totalColumns);
  const rightCells = padToColumns(rightDigits, totalColumns);

  // All hooks must run unconditionally (rules-of-hooks) — the malformed-
  // `display` fallback below only skips rendering, never a hook call; it
  // should never actually trigger, since every `displayMode: 'vertical'`
  // question's own generator produces exactly `"A + B"` / `"A − B"`.
  const [scratch, setScratch] = useState<string[]>(() => Array(totalColumns).fill(''));
  const [answer, setAnswer] = useState<string[]>(() => Array(totalColumns).fill(''));
  const answerRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { t } = useTranslation();

  // Starts the student right where solving by hand starts — the ones place —
  // instead of making them click it first.
  useEffect(() => {
    answerRefs.current[totalColumns - 1]?.focus();
    // Only on mount: this scene is remounted per question (keyed by id), so
    // there is nothing to re-focus later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!match) return <MathText className="pv-display">{display}</MathText>;

  function setDigit(setter: typeof setAnswer, index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setter((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    return digit;
  }

  // Column index `totalColumns - 1` is the ones place (rightmost on screen,
  // last in the array) — solving by hand always starts there and moves
  // toward the more significant places, so focus advances from high index
  // to low index, the opposite of normal left-to-right tab order.
  function handleAnswerChange(index: number, raw: string) {
    const digit = setDigit(setAnswer, index, raw);
    if (digit && index > 0) answerRefs.current[index - 1]?.focus();
  }

  function handleAnswerKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !answer[index] && index < totalColumns - 1) answerRefs.current[index + 1]?.focus();
    if (event.key === 'Enter') submit();
  }

  function submit() {
    const raw = answer.join('');
    if (raw.trim() === '') return;
    onAnswer(raw);
  }

  const cellClass = (index: number) => `pv-vertical-cell${startsNewGroup(index, totalColumns) ? ' pv-vertical-cell-group' : ''}`;

  return (
    <>
      <div className="pv-vertical-arith" dir="ltr">
        <div className="pv-vertical-grid-row">
          <span className="pv-vertical-gutter" aria-hidden="true" />
          <div className="pv-vertical-cells" aria-hidden="true">
            {scratch.map((digit, index) => (
              <input
                key={index}
                className={`pv-vertical-scratch-box ${cellClass(index)}`}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={locked}
                tabIndex={-1}
                onChange={(event) => setDigit(setScratch, index, event.target.value)}
              />
            ))}
          </div>
        </div>
        <div className="pv-vertical-grid-row">
          <span className="pv-vertical-gutter" aria-hidden="true" />
          <div className="pv-vertical-cells">
            {leftCells.map((digit, index) => (
              <span key={index} className={cellClass(index)}>
                {digit}
              </span>
            ))}
          </div>
        </div>
        <div className="pv-vertical-grid-row">
          <span className="pv-vertical-gutter pv-vertical-operator">{operator}</span>
          <div className="pv-vertical-cells">
            {rightCells.map((digit, index) => (
              <span key={index} className={cellClass(index)}>
                {digit}
              </span>
            ))}
          </div>
        </div>
        <div className="pv-vertical-grid-row">
          <span className="pv-vertical-gutter" aria-hidden="true" />
          <span className="pv-vertical-rule" style={{ width: `calc(${totalColumns} * var(--pv-cell-size) + ${totalColumns - 1} * var(--pv-cell-gap))` }} aria-hidden="true" />
        </div>
        <div className="pv-vertical-grid-row">
          <span className="pv-vertical-gutter" aria-hidden="true" />
          <div className="pv-vertical-cells">
            {answer.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  answerRefs.current[index] = el;
                }}
                className={`pv-vertical-answer-box ${cellClass(index)}`}
                data-testid={`pv-vertical-digit-${index}`}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={locked}
                onChange={(event) => handleAnswerChange(index, event.target.value)}
                onKeyDown={(event) => handleAnswerKeyDown(index, event)}
              />
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary pv-submit"
        data-testid="pv-submit"
        disabled={locked || answer.every((digit) => digit === '')}
        onClick={submit}
      >
        {t('decimalExamPrep.common.check')}
      </button>
    </>
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
