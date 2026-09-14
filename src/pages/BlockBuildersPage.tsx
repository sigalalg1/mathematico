import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSound } from '../audio/useSound';
import { MultiplicationArray } from '../components/MultiplicationArray';
import { MathText } from '../components/MathText';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import { evaluateBlockAnswer } from '../data/games/blockBuildersData';
import { useBlockBuildersGame } from '../hooks/useBlockBuildersGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import type { BlockAnswer, BlockFeedback, BlockMission } from '../types/blockBuilders';
import './BlockBuildersPage.css';

const GAME_ID = 'blockBuilders';
const GRADE_PATH = '/grade/4';
const SUCCESS_HOLD_MS = 1250;

export function BlockBuildersPage() {
  const { t } = useTranslation();
  const { enabled, play, toggle } = useSound();
  const game = useBlockBuildersGame();
  const mission = game.challenge;
  const [feedback, setFeedback] = useState<BlockFeedback | null>(null);
  const [selected, setSelected] = useState<BlockAnswer | null>(null);
  const [chosenRows, setChosenRows] = useState<number | null>(null);

  useGameSessionTracking(GAME_ID, {
    total: game.total,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setFeedback(null);
    setSelected(null);
    setChosenRows(null);
  }

  useEffect(() => {
    if (feedback !== 'correct') return undefined;
    const timer = window.setTimeout(() => game.next(), SUCCESS_HOLD_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  function submit(value: string) {
    if (feedback === 'correct') return;
    const answer = { value };
    const result = evaluateBlockAnswer(mission, answer);
    setSelected(answer);
    setFeedback(result);
    game.submit(answer);
    play(result === 'correct' ? 'hit' : result === 'reversed' ? 'phaseChange' : 'miss');
  }

  if (game.completed) {
    return (
      <PageLayout title={t('blockBuilders.gameName')} backTo={GRADE_PATH} backLabel={t('nav.grade4Topics')} variant="game">
        <div className="block-builders">
          <section className="bb-finale">
            <div className="bb-city" aria-hidden="true">
              {[3, 5, 4, 7, 4, 6, 3].map((height, index) => (
                <span key={index} style={{ '--building-height': height } as React.CSSProperties} />
              ))}
            </div>
            <h2>{t('blockBuilders.completion.title')}</h2>
            <p>{t('blockBuilders.completion.summary', { count: game.total })}</p>
            <div className="bb-actions">
              <button className="btn bb-primary" type="button" onClick={game.retry}>
                {t('blockBuilders.actions.replay')}
              </button>
              <Link className="btn bb-secondary" to={GRADE_PATH}>
                {t('blockBuilders.actions.back')}
              </Link>
            </div>
          </section>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('blockBuilders.gameName')} backTo={GRADE_PATH} backLabel={t('nav.grade4Topics')} variant="game">
      <div className="block-builders">
        <section className="bb-site">
          <header className="bb-topbar">
            <MissionTrail current={game.index} total={game.total} />
            <SoundToggle enabled={enabled} onToggle={toggle} />
          </header>
          <div className="bb-sky" aria-hidden="true">
            <span className="bb-cloud bb-cloud-one" />
            <span className="bb-cloud bb-cloud-two" />
            <span className="bb-crane">┏━━━━┓</span>
          </div>

          <div className="bb-brief">
            <span className="bb-brief-kicker">{t('blockBuilders.mission', { current: game.index + 1 })}</span>
            <h2>{t(`blockBuilders.prompts.${mission.kind}`)}</h2>
            <MissionExpression mission={mission} />
          </div>

          <div className="bb-workspace">
            <MissionView
              mission={mission}
              chosenRows={chosenRows}
              setChosenRows={(rows) => {
                setChosenRows(rows);
                play('move');
              }}
              selected={selected}
              feedback={feedback}
              submit={submit}
            />
          </div>

          {feedback && (
            <FeedbackPanel mission={mission} feedback={feedback} selected={selected} />
          )}
        </section>
      </div>
    </PageLayout>
  );
}

function MissionExpression({ mission }: { mission: BlockMission }) {
  const { t } = useTranslation();
  if (mission.kind === 'completeBuild') {
    return <p className="bb-expression">{t('blockBuilders.labels.builtOf', { visible: mission.product - mission.missingCount!, total: mission.product })}</p>;
  }
  const expression =
    mission.kind === 'missingFactor'
      ? `? × ${mission.columns} = ${mission.product}`
      : `${mission.rows} × ${mission.columns}${mission.kind === 'quickBuild' ? '' : ` = ${mission.product}`}`;
  return <MathText className="bb-expression">{expression}</MathText>;
}

interface MissionViewProps {
  mission: BlockMission;
  chosenRows: number | null;
  setChosenRows: (value: number) => void;
  selected: BlockAnswer | null;
  feedback: BlockFeedback | null;
  submit: (value: string) => void;
}

function MissionView({ mission, chosenRows, setChosenRows, selected, feedback, submit }: MissionViewProps) {
  const { t } = useTranslation();
  const locked = feedback === 'correct';

  if (mission.kind === 'buildArray') {
    const rowChoices = dimensionChoices(mission.rows);
    const columnChoices = dimensionChoices(mission.columns);
    return (
      <div className="bb-builder">
        <div className="bb-dimension-controls">
          <ChoiceGroup label={t('blockBuilders.labels.rows')} values={rowChoices} selected={chosenRows} onSelect={setChosenRows} disabled={locked} />
          <ChoiceGroup
            label={t('blockBuilders.labels.columns')}
            values={columnChoices}
            selected={null}
            onSelect={(columns) => chosenRows !== null && submit(`${chosenRows}x${columns}`)}
            disabled={chosenRows === null || locked}
          />
        </div>
        <MultiplicationArray
          rows={chosenRows ?? mission.rows}
          columns={selected ? Number(selected.value.split('x')[1]) : mission.columns}
          visibleCount={selected ? (chosenRows ?? mission.rows) * Number(selected.value.split('x')[1]) : 0}
          ghostCount={selected ? 0 : mission.product}
          animated={Boolean(selected)}
          testId="main-array"
        />
      </div>
    );
  }

  if (mission.kind === 'matchBuild') {
    return (
      <div className="bb-build-options">
        {mission.buildOptions!.map((option) => (
          <button key={option.id} type="button" className="bb-build-card" onClick={() => submit(option.id)} disabled={locked}>
            <MultiplicationArray rows={option.rows} columns={option.columns} compact selected={selected?.value === option.id} />
            <MathText>{option.rows} × {option.columns}</MathText>
          </button>
        ))}
      </div>
    );
  }

  const visibleCount = mission.kind === 'completeBuild' ? mission.product - mission.missingCount! : mission.product;
  return (
    <div className="bb-number-mission">
      {mission.kind !== 'quickBuild' || selected ? (
        <MultiplicationArray
          rows={mission.rows}
          columns={mission.columns}
          visibleCount={visibleCount}
          ghostCount={mission.kind === 'completeBuild' ? mission.missingCount : 0}
          animated={feedback === 'correct'}
          testId="main-array"
        />
      ) : (
        <div className="bb-blueprint" aria-hidden="true"><span /> <span /> <span /></div>
      )}
      <div className="bb-number-choices">
        {mission.choices.map((choice) => (
          <button key={choice} type="button" onClick={() => submit(String(choice))} disabled={locked}>
            <MathText>{choice}</MathText>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceGroup({ label, values, selected, onSelect, disabled }: { label: string; values: number[]; selected: number | null; onSelect: (value: number) => void; disabled: boolean }) {
  return (
    <div className="bb-choice-group">
      <span>{label}</span>
      <div>
        {values.map((value) => (
          <button className={selected === value ? 'is-selected' : ''} key={value} type="button" onClick={() => onSelect(value)} disabled={disabled}>
            <MathText>{value}</MathText>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackPanel({ mission, feedback, selected }: { mission: BlockMission; feedback: BlockFeedback; selected: BlockAnswer | null }) {
  const { t } = useTranslation();
  const selectedNumber = Number(selected?.value);
  const targetNumber = mission.kind === 'missingFactor' ? mission.rows : mission.kind === 'completeBuild' ? mission.missingCount! : mission.product;
  return (
    <aside className={`bb-feedback bb-feedback-${feedback}`} role="status">
      <div>
        <strong>{t(`blockBuilders.feedback.${feedback}.title`)}</strong>
        <p>{t(`blockBuilders.feedback.${feedback}.body`, { rows: mission.rows, columns: mission.columns, product: mission.product })}</p>
        {feedback === 'correct' && (
          <MathText className="bb-repeated-addition">
            {Array.from({ length: mission.rows }, () => mission.columns).join(' + ')} = {mission.product}
          </MathText>
        )}
      </div>
      {feedback !== 'correct' && feedback !== 'reversed' && Number.isFinite(selectedNumber) && (
        <div className="bb-comparison" aria-label={t('blockBuilders.a11y.comparison', { selected: selectedNumber, target: targetNumber })}>
          <BlockStrip count={selectedNumber} />
          <span className="bb-comparison-arrow">→</span>
          <BlockStrip count={targetNumber} />
        </div>
      )}
      {feedback === 'reversed' && (
        <div className="bb-rotate-demo" aria-label={t('blockBuilders.a11y.rotation')}>
          <MathText>{mission.columns} × {mission.rows} = {mission.product}</MathText>
          <span>↻</span>
          <MathText>{mission.rows} × {mission.columns} = {mission.product}</MathText>
        </div>
      )}
    </aside>
  );
}

function BlockStrip({ count }: { count: number }) {
  return (
    <span className="bb-block-strip">
      <span>{count}</span>
      <span aria-hidden="true">
        {Array.from({ length: Math.min(count, 8) }, (_, index) => <i key={index} />)}
        {count > 8 && <b>+</b>}
      </span>
    </span>
  );
}

function MissionTrail({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div className="bb-trail" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total} aria-label={t('blockBuilders.progress', { current: current + 1, total })}>
      {Array.from({ length: total }, (_, index) => <span key={index} className={index < current ? 'done' : index === current ? 'active' : ''} />)}
    </div>
  );
}

function dimensionChoices(answer: number): number[] {
  return [...new Set([Math.max(2, answer - 1), answer, Math.min(10, answer + 1)])];
}
