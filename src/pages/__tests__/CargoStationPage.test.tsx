import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { CargoStationPage } from '../CargoStationPage';
import type { CargoChallenge } from '../../types/cargoStation';

// Mission 1: 12 boxes / 4 robots -> 3 each, nothing left over.
// Mission 2: 17 boxes / 4 robots -> 4 each, 1 left over.
vi.mock('../../data/games/cargoStationData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/cargoStationData')>();
  return {
    ...original,
    CARGO_STATION_TOTAL: 2,
    // Fixed button order keeps the tests readable; the shuffle is covered by the data tests.
    buildQuotientChoices: (challenge: CargoChallenge) => {
      const quotient = Math.floor(challenge.dividend / challenge.divisor);
      return [quotient - 1, quotient, quotient + 1];
    },
    buildCargoStationStages: () => [
      {
        id: 'stage1',
        nameKey: 'cargoStation.stages.stage1.name',
        introKey: 'cargoStation.stages.stage1.intro',
        challenges: [{ id: 'stage1-0', stageId: 'stage1', dividend: 12, divisor: 4, quotient: 3, remainder: 0 }],
      },
      {
        id: 'stage2',
        nameKey: 'cargoStation.stages.stage2.name',
        introKey: 'cargoStation.stages.stage2.intro',
        challenges: [{ id: 'stage2-0', stageId: 'stage2', dividend: 17, divisor: 4, quotient: 4, remainder: 1 }],
      },
    ],
  };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

const robots = (c: HTMLElement) => Array.from(c.querySelectorAll('.cs-robot'));
const robotLoad = (index: number) => screen.getByTestId(`robot-stack-${index}`).querySelectorAll('.cs-box').length;
const depotBoxes = () => screen.getByTestId('depot-boxes').querySelectorAll('.cs-box').length;
const storageBoxes = () => screen.getByTestId('storage-boxes').querySelectorAll('.cs-box').length;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const amountButton = (count: number) => screen.getByRole('button', { name: t('cargoStation.a11y.choose', { count }) });

/** Taps an amount and lets the distribution animation finish. */
function choose(count: number) {
  fireEvent.click(amountButton(count));
  act(() => vi.advanceTimersByTime(1200));
}

/**
 * Watches the launch play out and the next mission arrive. Each phase schedules
 * its follow-up timer only after React has committed, so the clock is advanced
 * one phase at a time.
 */
function watchLaunch() {
  act(() => vi.advanceTimersByTime(1200));
  act(() => vi.advanceTimersByTime(1000));
}

/** Waits out a failed attempt, after which the station resets itself. */
function watchReset() {
  act(() => vi.advanceTimersByTime(2000));
}

describe('Cargo Station — the arrival', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the whole load, one robot per divisor, and asks the single question', () => {
    const { container } = renderWithProviders(<CargoStationPage />);

    expect(depotBoxes()).toBe(12);
    expect(robots(container)).toHaveLength(4);
    expect(screen.getByText(t('cargoStation.question'))).toBeInTheDocument();
  });

  it('offers large amount buttons instead of the old manual distribution UI', () => {
    const { container } = renderWithProviders(<CargoStationPage />);

    expect(container.querySelectorAll('.cs-choice')).toHaveLength(3);
    for (const count of [2, 3, 4]) expect(amountButton(count)).toBeInTheDocument();
    // The retired interaction model must be gone, not hidden alongside the new one.
    expect(container.querySelector('.cs-stepper')).toBeNull();
    expect(screen.queryByText(t('cargoStation.equation.remainderWord'))).not.toBeInTheDocument();
  });

  it('starts every robot empty, so no cargo has moved before the child decides', () => {
    renderWithProviders(<CargoStationPage />);
    for (let i = 0; i < 4; i++) expect(robotLoad(i)).toBe(0);
    expect(storageBoxes()).toBe(0);
  });
});

describe('Cargo Station — the correct choice', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('distributes the cargo, empties the depot and shows the equation', () => {
    renderWithProviders(<CargoStationPage />);
    choose(3);

    for (let i = 0; i < 4; i++) expect(robotLoad(i)).toBe(3);
    expect(depotBoxes()).toBe(0);
    expect(storageBoxes()).toBe(0);
    expect(screen.getByTestId('cargo-equation').textContent).toContain('12 ÷ 4 = 3');
  });

  it('launches the robots and moves on to the next mission without another tap', () => {
    renderWithProviders(<CargoStationPage />);
    expect(progress()).toBe('1');

    choose(3);
    watchLaunch();

    expect(progress()).toBe('2');
    expect(depotBoxes()).toBe(17);
    expect(screen.getByText(t('cargoStation.question'))).toBeInTheDocument();
  });

  it('leaves the remainder visible in the remainder bay next to the equation', () => {
    renderWithProviders(<CargoStationPage />);
    choose(3);
    watchLaunch();

    // Mission 2: 17 / 4 -> 4 each and 1 box that cannot be shared.
    choose(4);
    for (let i = 0; i < 4; i++) expect(robotLoad(i)).toBe(4);
    expect(storageBoxes()).toBe(1);
    expect(depotBoxes()).toBe(0);

    const equation = screen.getByTestId('cargo-equation').textContent ?? '';
    expect(equation).toContain('17 ÷ 4 = 4');
    expect(equation).toContain(t('cargoStation.equation.remainderWord'));
    expect(equation).toContain('1');
  });

  it('finishes the round after the last mission', () => {
    renderWithProviders(<CargoStationPage />);
    choose(3);
    watchLaunch();
    choose(4);
    watchLaunch();

    expect(screen.getByText(t('cargoStation.completion.title'))).toBeInTheDocument();
  });
});

describe('Cargo Station — a choice that is too high', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the depot dry and strands the last robot instead of just saying "wrong"', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    choose(4); // 4 x 4 = 16 > 12 boxes.

    expect(robotLoad(0)).toBe(4);
    expect(robotLoad(1)).toBe(4);
    expect(robotLoad(2)).toBe(4);
    expect(robotLoad(3)).toBe(0);
    expect(depotBoxes()).toBe(0);
    expect(screen.getByText(t('cargoStation.feedback.tooHigh'))).toBeInTheDocument();
    expect(container.querySelectorAll('.cs-robot-incomplete')).toHaveLength(1);
  });

  it('resets the station quickly and lets the child choose again on the same mission', () => {
    renderWithProviders(<CargoStationPage />);
    choose(4);
    watchReset();

    expect(progress()).toBe('1');
    expect(depotBoxes()).toBe(12);
    for (let i = 0; i < 4; i++) expect(robotLoad(i)).toBe(0);

    choose(3);
    expect(screen.getByTestId('cargo-equation').textContent).toContain('12 ÷ 4 = 3');
  });
});

describe('Cargo Station — a choice that is too low', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shares equally but shows that another full round still fits', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    choose(2); // 2 x 4 = 8, leaving 4 boxes: still one more round for everyone.

    for (let i = 0; i < 4; i++) expect(robotLoad(i)).toBe(2);
    expect(storageBoxes()).toBe(4);
    expect(screen.getByText(t('cargoStation.feedback.tooLow'))).toBeInTheDocument();
    // One more box is visibly heading to every robot.
    expect(container.querySelectorAll('.cs-ghost-box')).toHaveLength(4);
    expect(screen.queryByTestId('cargo-equation')).not.toBeInTheDocument();
  });

  it('does not advance the mission and clears itself for another try', () => {
    renderWithProviders(<CargoStationPage />);
    choose(2);
    watchReset();

    expect(progress()).toBe('1');
    expect(storageBoxes()).toBe(0);
    expect(screen.getByText(t('cargoStation.question'))).toBeInTheDocument();
  });
});

describe('Cargo Station — languages', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('he');
  });

  it.each(['he', 'en'] as const)('renders in %s with no raw translation keys', async (language) => {
    await i18n.changeLanguage(language);
    const { container } = renderWithProviders(<CargoStationPage />);
    const text = container.textContent ?? '';

    expect(text).not.toContain('cargoStation.');
    expect(screen.getByRole('heading', { level: 1, name: t('cargoStation.gameName') })).toBeInTheDocument();
  });

  it('keeps the division sentence LTR on the Hebrew page', async () => {
    await i18n.changeLanguage('he');
    renderWithProviders(<CargoStationPage />);
    choose(3);

    expect(screen.getByTestId('cargo-equation').querySelector('.cs-equation-text')).toHaveAttribute('dir', 'ltr');
  });

  it('never shows the stage scaffolding to the child', async () => {
    await i18n.changeLanguage('he');
    const { container } = renderWithProviders(<CargoStationPage />);
    const text = container.textContent ?? '';

    expect(text).not.toContain(t('cargoStation.stages.stage1.name'));
    expect(text).not.toContain(t('cargoStation.progress', { current: 1, total: 2 }));
  });
});
