import { useTranslation } from 'react-i18next';
import { FractionCollection } from './FractionCollection';
import { FractionNotation } from './FractionNotation';
import { FractionNumberLine } from './FractionNumberLine';
import { FractionShape } from './FractionShape';
import { MathText } from './MathText';
import type { FractionChallenge, FractionChoice, FractionValue } from '../types/fractionsPart1';

export type FractionSceneStatus = 'unanswered' | 'correct' | 'incorrect';

/**
 * The visual half of every fraction question, shared by the unit's own round
 * and by the training-mode version of the same activities: the model, the
 * number line, the collection and the answer dock.
 *
 * Extracted rather than duplicated so the three answer-leak rules the unit
 * depends on — no value printed beside a number-line marker, no numbers on the
 * two compared models, comparison signs locked to LTR — hold in both places by
 * construction instead of by being remembered twice.
 */

interface FractionChallengeSceneProps {
  challenge: FractionChallenge;
  selectedPieces: number[];
  selectedAnswer: string | null;
  status: FractionSceneStatus;
  onTogglePiece: (index: number) => void;
  onSubmit: (answer: string) => void;
}

export function FractionChallengeScene(props: FractionChallengeSceneProps) {
  const { challenge, selectedPieces, selectedAnswer, status, onTogglePiece, onSubmit } = props;
  const { t } = useTranslation();
  const checkLabel = t('fractionsPart1.actions.check');
  const pieceLabel = (index: number, total: number) => t('fractionsPart1.a11y.piece', { index: index + 1, total });
  const lineLabel = t('fractionsPart1.a11y.numberLine');
  /*
    A collection the child has to *read* is named without its coloured count:
    the accessible name would otherwise hand over the very fraction the question
    is asking for — the same leak the number line was fixed for.
  */
  const collectionLabel =
    challenge.choices.length > 0
      ? t('fractionsPart1.a11y.collectionPlain', { total: challenge.collectionTotal })
      : t('fractionsPart1.a11y.collection', { selected: 0, total: challenge.collectionTotal });
  const isPizza = challenge.kind === 'pizzaBuild' || challenge.kind === 'pizzaRead';
  const isBuild = challenge.kind === 'build' || challenge.kind === 'pizzaBuild';

  if (isBuild) {
    return (
      <div className={`fp-direct-model${isPizza ? ' fp-pizza' : ''}`}>
        <FractionShape
          shape={isPizza ? 'circle' : challenge.shape}
          pieces={challenge.fraction.denominator}
          selected={selectedPieces}
          onTogglePiece={onTogglePiece}
          pieceLabel={(index) => pieceLabel(index, challenge.fraction.denominator)}
          data-testid="fraction-direct-model"
        />
        <FractionNotation numerator={selectedPieces.length} denominator={challenge.fraction.denominator} size="lg" />
        <button
          type="button"
          className="fp-check"
          disabled={selectedPieces.length === 0 || status === 'correct'}
          onClick={() => onSubmit(String(selectedPieces.length))}
        >
          {checkLabel}
        </button>
      </div>
    );
  }

  if (challenge.kind === 'readModel' || challenge.kind === 'pizzaRead') {
    return (
      <>
        <div className={`fp-hero-model${isPizza ? ' fp-pizza' : ''}`}>
          <FractionShape
            shape={isPizza ? 'circle' : challenge.shape}
            pieces={challenge.fraction.denominator}
            selected={challenge.selected}
          />
        </div>
        <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
      </>
    );
  }

  if (challenge.kind === 'terms') {
    const highlight = challenge.termTarget === 'numerator' || challenge.termTarget === 'selected' ? 'numerator' : 'denominator';
    return (
      <>
        <div className="fp-symbol-model">
          <FractionShape shape={challenge.shape} pieces={challenge.fraction.denominator} selected={challenge.selected} />
          <FractionNotation
            numerator={challenge.fraction.numerator}
            denominator={challenge.fraction.denominator}
            highlight={highlight}
            size="lg"
          />
        </div>
        <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
      </>
    );
  }

  if (challenge.kind === 'findModel' || challenge.kind === 'equivalent') {
    return (
      <div className="fp-model-dock">
        {challenge.choices.map((choice) => (
          <ModelChoice
            key={choice.id}
            choice={choice}
            selected={selectedAnswer === choice.value}
            correct={status === 'correct' && selectedAnswer === choice.value}
            wrong={status === 'incorrect' && selectedAnswer === choice.value}
            onSelect={() => onSubmit(choice.value)}
          />
        ))}
      </div>
    );
  }

  if (challenge.kind === 'whole') {
    const assembled = [...new Set([...challenge.selected, ...selectedPieces])];
    return (
      <div className="fp-direct-model fp-whole-builder">
        <div className="fp-whole-workbench">
          <FractionShape
            shape={challenge.shape}
            pieces={challenge.fraction.denominator}
            selected={assembled}
            separated
            onTogglePiece={(index) => {
              if (!challenge.selected.includes(index)) onTogglePiece(index);
            }}
            pieceLabel={(index) => pieceLabel(index, challenge.fraction.denominator)}
          />
        </div>
        <button
          type="button"
          className="fp-check"
          disabled={selectedPieces.length === 0 || status === 'correct'}
          onClick={() => onSubmit(String(assembled.length))}
        >
          {checkLabel}
        </button>
      </div>
    );
  }

  if (challenge.kind === 'numberLinePlace' || challenge.kind === 'numberLineRead') {
    return (
      <div className="fp-line-stage">
        <FractionNumberLine
          denominator={challenge.fraction.denominator}
          markedNumerator={challenge.kind === 'numberLineRead' ? challenge.fraction.numerator : undefined}
          selectedNumerator={challenge.kind === 'numberLinePlace' && selectedAnswer !== null ? Number(selectedAnswer) : null}
          interactive={challenge.kind === 'numberLinePlace'}
          onSelect={(value) => onSubmit(String(value))}
          label={lineLabel}
        />
        {challenge.kind === 'numberLineRead' && (
          <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
        )}
      </div>
    );
  }

  if (challenge.kind === 'compare' && challenge.compareWith) {
    return (
      <>
        {/*
          Locked to LTR: `<` and `>` are bidi-mirrored characters, so inside the
          RTL page they would render as their opposite once selected, and the
          two models would swap sides — making the sign disagree with both the
          question and the stored answer.
        */}
        <div className="fp-comparison" dir="ltr">
          <VisualFraction fraction={challenge.fraction} shape="circle" />
          <span className="fp-comparison-slot">
            <MathText>{selectedAnswer ?? '?'}</MathText>
          </span>
          <VisualFraction fraction={challenge.compareWith} shape="bar" />
        </div>
        <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
      </>
    );
  }

  if (challenge.choices.length === 0) {
    return (
      <div className="fp-direct-collection">
        <FractionCollection
          total={challenge.collectionTotal!}
          selected={0}
          selectedIndices={selectedPieces}
          onToggle={onTogglePiece}
          label={collectionLabel}
        />
        <FractionNotation numerator={selectedPieces.length} denominator={challenge.collectionTotal!} size="lg" />
        <button
          type="button"
          className="fp-check"
          disabled={selectedPieces.length === 0 || status === 'correct'}
          onClick={() => onSubmit(String(selectedPieces.length))}
        >
          {checkLabel}
        </button>
      </div>
    );
  }

  return (
    <>
      <FractionCollection
        total={challenge.collectionTotal!}
        selected={challenge.collectionSelected!}
        label={collectionLabel}
      />
      <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
    </>
  );
}

/** True for the questions that name the fraction the child has to produce. */
function fractionChallengeShowsTarget(challenge: FractionChallenge): boolean {
  return (
    ['build', 'findModel', 'equivalent', 'numberLinePlace', 'pizzaBuild'].includes(challenge.kind) ||
    (challenge.kind === 'collection' && challenge.choices.length === 0)
  );
}

/**
 * A comparison model, shown without its numeric value: reading the fraction off
 * the shaded shape is the reasoning step the comparison question is asking for.
 */
function VisualFraction({ fraction, shape }: { fraction: FractionValue; shape: 'circle' | 'bar' }) {
  return (
    <div className="fp-visual-fraction">
      <FractionShape
        shape={shape}
        pieces={fraction.denominator}
        selected={Array.from({ length: fraction.numerator }, (_, index) => index)}
      />
    </div>
  );
}

function ModelChoice({
  choice,
  selected,
  correct,
  wrong,
  onSelect,
}: {
  choice: FractionChoice;
  selected: boolean;
  correct: boolean;
  wrong: boolean;
  onSelect: () => void;
}) {
  const fraction = choice.fraction!;
  return (
    <button
      type="button"
      className={`fp-model-choice${selected ? ' is-selected' : ''}${correct ? ' is-correct' : ''}${wrong ? ' is-wrong' : ''}`}
      onClick={onSelect}
    >
      <FractionShape
        shape={choice.shape ?? 'bar'}
        pieces={fraction.denominator}
        selected={Array.from({ length: fraction.numerator }, (_, index) => index)}
      />
      <FractionNotation numerator={fraction.numerator} denominator={fraction.denominator} size="sm" />
    </button>
  );
}

function ChoiceDock({
  choices,
  selected,
  status,
  onSelect,
}: {
  choices: FractionChoice[];
  selected: string | null;
  status: FractionSceneStatus;
  onSelect: (answer: string) => void;
}) {
  return (
    <div className="fp-choice-dock">
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          type="button"
          className={`fp-choice fp-choice-${index % 4}${selected === choice.value ? ' is-selected' : ''}${
            selected === choice.value && status === 'correct' ? ' is-correct' : ''
          }${selected === choice.value && status === 'incorrect' ? ' is-wrong' : ''}`}
          onClick={() => onSelect(choice.value)}
          disabled={status === 'correct'}
        >
          {choice.fraction ? (
            <FractionNotation numerator={choice.fraction.numerator} denominator={choice.fraction.denominator} />
          ) : (
            <MathText>{choice.value}</MathText>
          )}
        </button>
      ))}
    </div>
  );
}

/** The friendly guide beside the question, reacting to the last answer. */
export function FractionGuide({ status }: { status: FractionSceneStatus }) {
  return (
    <svg className={`fp-guide fp-guide-${status}`} viewBox="0 0 120 150" aria-hidden="true">
      <ellipse cx="60" cy="140" rx="38" ry="7" fill="rgba(25,45,90,.18)" />
      <path d="M28 82 Q60 58 92 82 L84 130 Q60 143 36 130 Z" fill="#5b46d6" />
      <circle cx="60" cy="56" r="34" fill="#ffcf9f" />
      <path d="M29 52 Q35 15 62 20 Q90 22 91 57 Q75 37 29 52" fill="#29416f" />
      <circle cx="49" cy="58" r="4" fill="#252144" />
      <circle cx="72" cy="58" r="4" fill="#252144" />
      <path
        d={
          status === 'correct'
            ? 'M47 71 Q60 84 74 70'
            : status === 'incorrect'
              ? 'M48 76 Q60 65 73 76'
              : 'M49 72 Q60 78 72 72'
        }
        fill="none"
        stroke="#8a4c39"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path className="fp-guide-arm" d="M34 92 Q15 78 18 60" fill="none" stroke="#ffcf9f" strokeWidth="12" strokeLinecap="round" />
      {status === 'incorrect' && (
        <text x="8" y="42" fontSize="25" fontWeight="900" fill="#29416f">
          ?
        </text>
      )}
      {status === 'correct' && <path d="M91 30 l7 12 14 2-10 10 3 14-14-7-12 7 2-15-10-9 14-2z" fill="#ffd54f" />}
    </svg>
  );
}

/** The question line: the instruction, plus the target fraction when there is one. */
export function FractionPrompt({ challenge }: { challenge: FractionChallenge }) {
  const { t } = useTranslation();
  return (
    <div className="fp-prompt">
      <span>{t(challenge.promptKey)}</span>
      {fractionChallengeShowsTarget(challenge) && (
        <FractionNotation
          numerator={challenge.fraction.numerator}
          denominator={challenge.fraction.denominator}
          size="lg"
        />
      )}
    </div>
  );
}
