import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { CoordinateScalePage } from '../CoordinateScalePage';
import type { ScaleChallenge } from '../../types/coordinateScale';

// A scale-2 question with partially labelled axes, and a scale-0.5 question
// whose scale can only come from the plotted anchor point A.
const LABELS_CHALLENGE: ScaleChallenge = {
  id: 'q1',
  kind: 'locatePoint',
  evidence: 'labels',
  scale: 2,
  labeledTicks: { x: [3, 4], y: [3, 4] },
  anchor: null,
  axis: null,
  targetTick: { x: 1, y: 2 },
  targetValue: { x: 2, y: 4 },
  targetLabel: 'B',
  reference: { axis: 'x', fromTick: 0, toTick: 3 },
  options: [
    { id: 'p', tick: { x: 1, y: 2 }, label: 'P', kind: 'correct' },
    { id: 'q', tick: { x: 2, y: 4 }, label: 'Q', kind: 'scaleAsOne' },
    { id: 'r', tick: { x: 2, y: 1 }, label: 'R', kind: 'swappedXY' },
    { id: 's', tick: { x: 1, y: -2 }, label: 'S', kind: 'signError' },
  ],
  correctOptionId: 'p',
};

const ANCHOR_CHALLENGE: ScaleChallenge = {
  id: 'q2',
  kind: 'locatePoint',
  evidence: 'anchor',
  scale: 0.5,
  labeledTicks: { x: [], y: [] },
  anchor: { tick: { x: 1, y: 3 }, label: 'A' },
  axis: null,
  targetTick: { x: 2, y: 4 },
  targetValue: { x: 1, y: 2 },
  targetLabel: 'B',
  reference: { axis: 'x', fromTick: 0, toTick: 1 },
  options: [
    { id: 'p2', tick: { x: 2, y: 4 }, label: 'P', kind: 'correct' },
    { id: 'q2a', tick: { x: 1, y: 2 }, label: 'Q', kind: 'scaleAsOne' },
    { id: 'r2', tick: { x: 4, y: 2 }, label: 'R', kind: 'swappedXY' },
  ],
  correctOptionId: 'p2',
};

vi.mock('../../data/games/coordinateScaleData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/games/coordinateScaleData')>();
  return {
    ...actual,
    COORDINATE_SCALE_TOTAL: 2,
    buildCoordinateScaleChallenges: () => [LABELS_CHALLENGE, ANCHOR_CHALLENGE],
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const candidate = (label: string) => screen.getByRole('button', { name: label });
const tickLabels = (container: HTMLElement) => [...container.querySelectorAll('.tick-label')].map((node) => node.textContent);

function answerFirstCorrectly() {
  fireEvent.click(candidate('P'));
  act(() => vi.advanceTimersByTime(1000));
}

describe("What's the Scale — reading the grid", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the asked point and clickable candidates on the plane', () => {
    renderWithProviders(<CoordinateScalePage />);
    expect(screen.getByText(t('coordinateScale.prompt.locate'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText('B = (2, 4)')).toBeInTheDocument();
    for (const label of ['P', 'Q', 'R', 'S']) expect(candidate(label)).toBeInTheDocument();
  });

  it('labels ticks with scaled values and hides the ticks the student must infer', () => {
    const { container } = renderWithProviders(<CoordinateScalePage />);
    const labels = tickLabels(container);
    // scale 2, labelled ticks 3 and 4 -> 6 and 8; the origin is always shown.
    expect(labels).toContain('6');
    expect(labels).toContain('8');
    expect(labels).toContain('0');
    // Tick 1 is deliberately unlabelled, so neither "1" nor its value "2" appears.
    expect(labels).not.toContain('1');
    expect(labels).not.toContain('2');
  });

  it('tells the student both axes share one scale', () => {
    renderWithProviders(<CoordinateScalePage />);
    expect(screen.getByText(t('coordinateScale.sameScale'))).toBeInTheDocument();
  });

  it('advances when the right grid square is clicked', () => {
    renderWithProviders(<CoordinateScalePage />);
    expect(progress()).toBe('1');
    answerFirstCorrectly();
    expect(progress()).toBe('2');
  });
});

describe("What's the Scale — wrong answers explain the scale", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('explains the interval visually when the student treats a square as 1 unit', () => {
    const { container } = renderWithProviders(<CoordinateScalePage />);
    fireEvent.click(candidate('Q'));

    expect(progress()).toBe('1');
    expect(
      screen.getByText(t('coordinateScale.feedback.scaleExplained', { to: '6', squares: 3, unit: '2' })),
    ).toBeInTheDocument();
    // The two reference ticks are highlighted right on the axis.
    expect(container.querySelector('.scale-hint-span')).toBeInTheDocument();
    expect([...container.querySelectorAll('.scale-hint-label')].map((n) => n.textContent)).toEqual(['0', '6']);
  });

  it('traces X-then-Y when the student swaps the coordinates', () => {
    const { container } = renderWithProviders(<CoordinateScalePage />);
    fireEvent.click(candidate('R'));

    expect(screen.getByText(t('coordinateScale.feedback.swapped'))).toBeInTheDocument();
    expect(container.querySelectorAll('.shape-segment-incorrect')).toHaveLength(2);
    expect(container.querySelector('.attempt-marker')).toBeInTheDocument();
    expect(container.querySelector('.scale-hint-span')).not.toBeInTheDocument();
  });

  it('points at the sign when the student mirrors the point', () => {
    renderWithProviders(<CoordinateScalePage />);
    fireEvent.click(candidate('S'));
    expect(screen.getByText(t('coordinateScale.feedback.signError'))).toBeInTheDocument();
  });

  it('reports the clicked position in real units, not grid squares', () => {
    renderWithProviders(<CoordinateScalePage />);
    fireEvent.click(candidate('Q')); // grid square (2, 4) means (4, 8) at scale 2
    expect(screen.getByText('(4, 8)')).toBeInTheDocument();
  });

  it('allows a retry in place after a wrong answer and only locks once correct', () => {
    const { container } = renderWithProviders(<CoordinateScalePage />);
    fireEvent.click(candidate('Q'));
    expect(container.querySelectorAll('.clickable-point.is-disabled')).toHaveLength(0);
    for (const label of ['P', 'Q', 'R', 'S']) expect(candidate(label)).toHaveAttribute('tabindex', '0');

    fireEvent.click(candidate('P'));
    expect(container.querySelectorAll('.clickable-point.is-disabled')).toHaveLength(4);
    act(() => vi.advanceTimersByTime(1000));
    expect(progress()).toBe('2');
  });

  it('does not reveal the correct square while the answer is still wrong', () => {
    const { container } = renderWithProviders(<CoordinateScalePage />);
    fireEvent.click(candidate('Q'));
    expect(container.querySelectorAll('.clickable-point.is-correct')).toHaveLength(0);
    expect(container.querySelectorAll('.clickable-point.is-incorrect')).toHaveLength(1);
  });
});

describe("What's the Scale — anchor point questions", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plots the known anchor point and states its coordinates', () => {
    const { container } = renderWithProviders(<CoordinateScalePage />);
    answerFirstCorrectly();

    expect(screen.getByText(t('coordinateScale.prompt.anchorKnown'), { exact: false })).toBeInTheDocument();
    expect(screen.getByText('A = (0.5, 1.5)')).toBeInTheDocument();
    expect([...container.querySelectorAll('.vertex-label')].map((node) => node.textContent)).toEqual(['A']);
  });

  it('hides every tick label except the origin so the anchor is the only clue', () => {
    const { container } = renderWithProviders(<CoordinateScalePage />);
    answerFirstCorrectly();
    expect(tickLabels(container)).toEqual(['0']);
  });

  it('accepts the half-unit point and finishes the session', () => {
    renderWithProviders(<CoordinateScalePage />);
    answerFirstCorrectly();
    expect(screen.getByText('B = (1, 2)')).toBeInTheDocument();

    fireEvent.click(candidate('P'));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(t('coordinateScale.completion.title'))).toBeInTheDocument();
  });
});

describe("What's the Scale — languages", () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('keeps coordinate notation LTR inside the Hebrew page', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<CoordinateScalePage />);
    const mathNodes = container.querySelectorAll('.math-text');
    expect(mathNodes.length).toBeGreaterThan(0);
    for (const node of mathNodes) expect(node).toHaveAttribute('dir', 'ltr');
    expect(container.querySelector('.coordinate-grid')).toHaveAttribute('dir', 'ltr');
  });

  it('renders in English with no raw translation keys', async () => {
    await useLanguage('en');
    const { container } = renderWithProviders(<CoordinateScalePage />);
    expect(container.textContent).not.toContain('coordinateScale.');
    expect(screen.getByText("What's the Scale?")).toBeInTheDocument();
  });

  it('renders in Hebrew with no raw translation keys', async () => {
    await useLanguage('he');
    const { container } = renderWithProviders(<CoordinateScalePage />);
    expect(container.textContent).not.toContain('coordinateScale.');
    expect(screen.getByText('מה קנה המידה?')).toBeInTheDocument();
  });
});
