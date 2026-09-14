import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { FractionFactoryPage } from '../FractionFactoryPage';
import type { FractionOrder } from '../../types/fractionFactory';

// A fixed three-order shift covering all three order kinds and all three shapes.
// Declared inside the mock factory because vi.mock is hoisted above the module body.
const TOTAL_ORDERS = 3;

vi.mock('../../data/games/fractionFactoryData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/fractionFactoryData')>();
  const orders: FractionOrder[] = [
    { id: 'o1', stageId: 'stage1', kind: 'build', numerator: 3, denominator: 4, shape: 'circle', cutOptions: [3, 4, 5], preselected: [], equalPatternFirst: true },
    { id: 'o2', stageId: 'stage2', kind: 'equalParts', numerator: 2, denominator: 4, shape: 'bar', cutOptions: [], preselected: [], equalPatternFirst: false },
    { id: 'o3', stageId: 'stage4', kind: 'reverse', numerator: 2, denominator: 3, shape: 'grid', cutOptions: [], preselected: [0, 2], equalPatternFirst: true },
  ];
  return {
    ...original,
    FRACTION_FACTORY_TOTAL: orders.length,
    buildFractionFactoryOrders: () => orders.map((order) => ({ ...order })),
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

const pieces = () => screen.getByTestId('ff-shape').querySelectorAll('.fs-piece').length;
const piece = (index: number) => screen.getAllByTestId(`fraction-piece-${index}`)[0];
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const cutButton = (count: number) => screen.getByRole('button', { name: t('fractionFactory.a11y.cut', { count }) });

/** Taps a piece count and lets the blade finish. */
function cut(count: number) {
  fireEvent.click(cutButton(count));
  act(() => vi.advanceTimersByTime(900));
}

/** Taps a piece of the cut whole. */
function takePiece(index: number) {
  fireEvent.click(piece(index));
}

/** Waits for the factory to settle and pack whatever is currently selected. */
function letItPack() {
  act(() => vi.advanceTimersByTime(1000));
}

/** Watches the finished order leave and the next one arrive. */
function watchShipping() {
  act(() => vi.advanceTimersByTime(1600));
}

/** Waits out a teaching beat, after which the machine resets itself. */
function watchTeachingBeat() {
  act(() => vi.advanceTimersByTime(2500));
}

describe('Fraction Factory — an order arrives', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the ordered fraction and an uncut whole', () => {
    renderWithProviders(<FractionFactoryPage />);

    expect(screen.getByTestId('ff-order-fraction')).toHaveAccessibleName('3/4');
    expect(pieces()).toBe(1);
    expect(screen.getByText(t('fractionFactory.prompt.cut'))).toBeInTheDocument();
  });

  it('offers large piece-count buttons and no check or confirm button', () => {
    const { container } = renderWithProviders(<FractionFactoryPage />);

    expect(container.querySelectorAll('.ff-choice')).toHaveLength(3);
    for (const count of [3, 4, 5]) expect(cutButton(count)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /check|confirm|next|בדיקה|הבא/i })).not.toBeInTheDocument();
  });
});

describe('Fraction Factory — the denominator decision', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('cuts the whole into exactly the number of pieces the child chose', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);

    expect(pieces()).toBe(4);
  });

  it('names the denominator against the pieces the child can see', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);

    expect(screen.getByTestId('ff-built-fraction')).toHaveAccessibleName('?/4');
    expect(screen.getByText(t('fractionFactory.lesson.denominator', { count: 4 }))).toBeInTheDocument();
  });

  it('teaches a wrong cut visually instead of just saying "wrong"', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(5);

    // The whole really does come apart into fifths, and the scene contrasts them.
    expect(pieces()).toBe(5);
    expect(screen.getByTestId('ff-wrong-cut')).toBeInTheDocument();
    expect(screen.getByTestId('ff-made-piece')).toHaveAccessibleName('1/5');
    expect(screen.getByTestId('ff-needed-piece')).toHaveAccessibleName('1/4');
    expect(screen.getByText(t('fractionFactory.feedback.wrongCut', { got: 5, want: 4 }))).toBeInTheDocument();
  });

  it('does not advance the order after a wrong cut, and lets the child cut again', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(5);
    expect(progress()).toBe('1');

    watchTeachingBeat();
    expect(progress()).toBe('1');
    expect(pieces()).toBe(1);

    cut(4);
    expect(pieces()).toBe(4);
  });
});

describe('Fraction Factory — the numerator decision', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('maps every selected piece straight onto the numerator', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);

    takePiece(0);
    expect(screen.getByTestId('ff-built-fraction')).toHaveAccessibleName('1/4');
    takePiece(1);
    expect(screen.getByTestId('ff-built-fraction')).toHaveAccessibleName('2/4');
    expect(screen.getByText(t('fractionFactory.lesson.numerator', { count: 2 }))).toBeInTheDocument();
  });

  it('lets a piece be taken back before the order is packed', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);

    takePiece(0);
    takePiece(1);
    takePiece(0);

    expect(screen.getByTestId('ff-built-fraction')).toHaveAccessibleName('1/4');
    expect(piece(0)).toHaveAttribute('data-selected', 'false');
    expect(piece(1)).toHaveAttribute('data-selected', 'true');
  });

  it('ships an order built with the right number of pieces and moves on by itself', () => {
    renderWithProviders(<FractionFactoryPage />);
    expect(progress()).toBe('1');

    cut(4);
    takePiece(0);
    takePiece(1);
    takePiece(2);
    letItPack();

    expect(screen.getByText(t('fractionFactory.feedback.shipped'))).toBeInTheDocument();
    watchShipping();
    expect(progress()).toBe('2');
  });

  it('shows the fraction actually built against the one ordered, instead of a red X', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);
    takePiece(0);
    takePiece(1);
    letItPack();

    const teach = screen.getByTestId('ff-wrong-pick');
    expect(teach).toBeInTheDocument();
    expect(screen.getByTestId('ff-built-fraction')).toHaveAccessibleName('2/4');
    expect(teach.textContent).toContain(t('fractionFactory.feedback.wrongPick'));
    // The order is still on screen to compare against.
    expect(screen.getByTestId('ff-order-fraction')).toHaveAccessibleName('3/4');
  });

  it('does not advance the order on a wrong numerator, and accepts a correction in place', () => {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);
    takePiece(0);
    takePiece(1);
    letItPack();
    expect(progress()).toBe('1');

    takePiece(2);
    letItPack();

    expect(screen.getByText(t('fractionFactory.feedback.shipped'))).toBeInTheDocument();
    watchShipping();
    expect(progress()).toBe('2');
  });
});

describe('Fraction Factory — the equal-parts lesson', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Plays through the first order so the equal-parts order is on screen. */
  function reachEqualPartsOrder() {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);
    takePiece(0);
    takePiece(1);
    takePiece(2);
    letItPack();
    watchShipping();
  }

  it('offers one genuinely equal and one visibly unequal cutting pattern', () => {
    reachEqualPartsOrder();

    expect(screen.getByText(t('fractionFactory.prompt.pattern'))).toBeInTheDocument();
    const equal = screen.getByTestId('ff-pattern-equal');
    const unequal = screen.getByTestId('ff-pattern-unequal');
    expect(equal.querySelectorAll('.fs-piece')).toHaveLength(4);
    expect(unequal.querySelectorAll('.fs-piece')).toHaveLength(4);
    // The invalid one is drawn from unequal geometry, not just labelled wrong.
    expect(unequal.querySelector('.fraction-shape-unequal')).not.toBeNull();
    expect(equal.querySelector('.fraction-shape-unequal')).toBeNull();
  });

  it('shows why unequal pieces cannot each be one quarter, and does not advance', () => {
    reachEqualPartsOrder();
    fireEvent.click(screen.getByTestId('ff-pattern-unequal'));

    expect(screen.getByTestId('ff-wrong-pattern')).toBeInTheDocument();
    expect(screen.getByText(t('fractionFactory.feedback.unequal'))).toBeInTheDocument();
    expect(progress()).toBe('2');

    watchTeachingBeat();
    expect(screen.getByTestId('ff-pattern-equal')).toBeInTheDocument();
  });

  it('cuts the whole and moves on to the numerator once the equal pattern is chosen', () => {
    reachEqualPartsOrder();
    fireEvent.click(screen.getByTestId('ff-pattern-equal'));
    act(() => vi.advanceTimersByTime(900));

    expect(pieces()).toBe(4);
    expect(screen.getByText(t('fractionFactory.lesson.denominator', { count: 4 }))).toBeInTheDocument();
  });
});

describe('Fraction Factory — reverse orders and finishing the shift', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Plays the first two orders so the reverse order is on screen. */
  function reachReverseOrder() {
    renderWithProviders(<FractionFactoryPage />);
    cut(4);
    takePiece(0);
    takePiece(1);
    takePiece(2);
    letItPack();
    watchShipping();

    fireEvent.click(screen.getByTestId('ff-pattern-equal'));
    act(() => vi.advanceTimersByTime(900));
    takePiece(0);
    takePiece(1);
    letItPack();
    watchShipping();
  }

  const dialUp = (which: 'numerator' | 'denominator') =>
    fireEvent.click(screen.getByRole('button', { name: t(`fractionFactory.a11y.${which}Up`) }));

  it('shows an already-cut whole with the right pieces highlighted', () => {
    reachReverseOrder();

    expect(progress()).toBe('3');
    expect(pieces()).toBe(3);
    expect(screen.getAllByTestId(/fraction-piece-/).filter((node) => node.getAttribute('data-selected') === 'true')).toHaveLength(2);
    expect(screen.getByText(t('fractionFactory.prompt.reverse'))).toBeInTheDocument();
  });

  it('lets the child dial the fraction in rather than pick from a quiz', () => {
    reachReverseOrder();

    expect(screen.queryByTestId('ff-order-fraction')).not.toBeInTheDocument();
    expect(screen.getByTestId('ff-dial-numerator')).toHaveTextContent('1');
    expect(screen.getByTestId('ff-dial-denominator')).toHaveTextContent('2');
  });

  it('teaches a mismatched fraction without giving the answer away, and does not advance', () => {
    reachReverseOrder();
    dialUp('numerator'); // 2/2 — wrong denominator for a shape cut into thirds.
    letItPack();

    expect(screen.getByText(t('fractionFactory.feedback.wrongReverse'))).toBeInTheDocument();
    expect(progress()).toBe('3');
  });

  it('accepts the fraction that matches the shape and completes the shift', () => {
    reachReverseOrder();
    dialUp('denominator'); // 1/3
    dialUp('numerator'); // 2/3
    letItPack();
    watchShipping();

    expect(screen.getByText(t('fractionFactory.completion.title'))).toBeInTheDocument();
    expect(screen.getByText(t('fractionFactory.completion.summary', { total: TOTAL_ORDERS }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('fractionFactory.actions.playAgain') })).toBeInTheDocument();
  });

  it('offers no grade, coins or streak on completion', () => {
    reachReverseOrder();
    dialUp('denominator');
    dialUp('numerator');
    letItPack();
    watchShipping();

    expect(document.body.textContent).not.toMatch(/%|🪙|streak/i);
  });
});

describe('Fraction Factory — languages', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('he');
  });

  it.each(['he', 'en'] as const)('renders in %s with no raw translation keys', async (language) => {
    await i18n.changeLanguage(language);
    const { container } = renderWithProviders(<FractionFactoryPage />);

    expect(container.textContent ?? '').not.toContain('fractionFactory.');
    expect(screen.getByRole('heading', { level: 1, name: t('fractionFactory.gameName') })).toBeInTheDocument();
  });

  it('keeps the fraction notation LTR on the Hebrew page', async () => {
    await i18n.changeLanguage('he');
    renderWithProviders(<FractionFactoryPage />);

    expect(screen.getByTestId('ff-order-fraction').closest('.fraction')).toHaveAttribute('dir', 'ltr');
  });

  it('never shows the internal stage scaffolding to the child', async () => {
    await i18n.changeLanguage('he');
    const { container } = renderWithProviders(<FractionFactoryPage />);
    const text = container.textContent ?? '';

    expect(text).not.toContain(t('fractionFactory.progress', { current: 1, total: TOTAL_ORDERS }));
    expect(text).not.toMatch(/stage|שלב/i);
  });
});
