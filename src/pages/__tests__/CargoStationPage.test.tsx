import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { CargoStationPage } from '../CargoStationPage';

vi.mock('../../data/games/cargoStationData', () => ({
  CARGO_STATION_TOTAL: 2,
  buildCargoStationStages: () => [
    {
      id: 'stage1',
      nameKey: 'cargoStation.stages.stage1.name',
      introKey: 'cargoStation.stages.stage1.intro',
      // 6 crates, 3 loaders -> 2 each, nothing left over.
      challenges: [{ id: 'stage1-0', stageId: 'stage1', dividend: 6, divisor: 3, quotient: 2, remainder: 0 }],
    },
    {
      id: 'stage2',
      nameKey: 'cargoStation.stages.stage2.name',
      introKey: 'cargoStation.stages.stage2.intro',
      // 7 crates, 3 loaders -> 2 each, 1 left over.
      challenges: [{ id: 'stage2-0', stageId: 'stage2', dividend: 7, divisor: 3, quotient: 2, remainder: 1 }],
    },
  ],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const loaders = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLButtonElement>('.cs-loader'));
const platformCrates = () => screen.getByTestId('platform-crates').querySelectorAll('.cs-crate').length;
const checkSplitButton = () => screen.queryByRole('button', { name: t('cargoStation.actions.checkSplit') });
const deliverButton = () => screen.getByRole('button', { name: t('cargoStation.actions.deliver') });

function give(container: HTMLElement, index: number, times = 1) {
  for (let i = 0; i < times; i++) fireEvent.click(loaders(container)[index]);
}

function bump(variant: 'quotient' | 'remainder', times: number) {
  for (let i = 0; i < times; i++) {
    fireEvent.click(screen.getByLabelText(t(`cargoStation.a11y.increase.${variant}`)));
  }
}

function shareEvenly(container: HTMLElement, perLoader: number) {
  const count = loaders(container).length;
  for (let round = 0; round < perLoader; round++) {
    for (let i = 0; i < count; i++) give(container, i);
  }
}

describe('Cargo Station — dealing the crates', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows every crate on the platform and one loader per divisor', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    expect(platformCrates()).toBe(6);
    expect(loaders(container)).toHaveLength(3);
  });

  it('moves a crate from the platform onto a loader when it is tapped', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    give(container, 0);
    expect(platformCrates()).toBe(5);
    expect(container.querySelectorAll('[data-testid="loader-stack-0"] .cs-crate')).toHaveLength(1);
  });

  it('explains an uneven split instead of accepting it, and stays playable', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    give(container, 0, 2);
    fireEvent.click(checkSplitButton()!);

    expect(screen.getByText(t('cargoStation.split.unequal'))).toBeInTheDocument();
    expect(checkSplitButton()).not.toBeNull();
    expect(loaders(container)[1]).not.toBeDisabled();
  });

  it('says the crates can still be shared when too many are left on the platform', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    shareEvenly(container, 1);
    fireEvent.click(checkSplitButton()!);

    expect(screen.getByText(t('cargoStation.split.canGiveMore'))).toBeInTheDocument();
    expect(checkSplitButton()).not.toBeNull();
  });

  it('lets the child start the distribution over', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    give(container, 0, 3);
    fireEvent.click(screen.getByRole('button', { name: t('cargoStation.actions.reset') }));
    expect(platformCrates()).toBe(6);
  });

  it('opens the written form once the split is equal', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    shareEvenly(container, 2);
    fireEvent.click(checkSplitButton()!);

    expect(checkSplitButton()).toBeNull();
    expect(screen.getByText(t('cargoStation.equation.remainderWord'))).toBeInTheDocument();
    expect(screen.getByText(t('cargoStation.platform.leftoverTitle'))).toBeInTheDocument();
  });
});

describe('Cargo Station — answering the division', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function reachAnswerPhase(container: HTMLElement, perLoader: number) {
    shareEvenly(container, perLoader);
    fireEvent.click(checkSplitButton()!);
  }

  it('advances to the next delivery on a correct quotient and remainder', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    reachAnswerPhase(container, 2);
    bump('quotient', 2);
    fireEvent.click(deliverButton());

    expect(screen.getByText(t('cargoStation.feedback.correct'))).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1200));
    expect(progress()).toBe('2');
    expect(platformCrates()).toBe(7);
  });

  it('does not advance on a wrong answer, shows the counts, and allows another try', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    reachAnswerPhase(container, 2);
    bump('quotient', 3);
    fireEvent.click(deliverButton());

    expect(screen.getByText(t('cargoStation.feedback.incorrect'))).toBeInTheDocument();
    expect(screen.getByText(t('cargoStation.counts.perLoader', { crates: 2 }))).toBeInTheDocument();
    expect(screen.getByText(t('cargoStation.counts.leftover', { crates: 0 }))).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1200));
    expect(progress()).toBe('1');

    // Retry in place: the deliver button must still work after a wrong answer.
    expect(deliverButton()).not.toBeDisabled();
    fireEvent.click(screen.getByLabelText(t('cargoStation.a11y.decrease.quotient')));
    fireEvent.click(deliverButton());
    act(() => vi.advanceTimersByTime(1200));
    expect(progress()).toBe('2');
  });

  it('needs the remainder too, and finishes the round on the last delivery', () => {
    const { container } = renderWithProviders(<CargoStationPage />);
    reachAnswerPhase(container, 2);
    bump('quotient', 2);
    fireEvent.click(deliverButton());
    act(() => vi.advanceTimersByTime(1200));

    // Second delivery: 7 crates, 3 loaders -> 2 each and 1 left over.
    reachAnswerPhase(container, 2);
    expect(platformCrates()).toBe(1);

    bump('quotient', 2);
    fireEvent.click(deliverButton());
    expect(screen.getByText(t('cargoStation.feedback.incorrect'))).toBeInTheDocument();

    bump('remainder', 1);
    fireEvent.click(deliverButton());
    act(() => vi.advanceTimersByTime(1200));

    expect(screen.getByText(t('cargoStation.completion.title'))).toBeInTheDocument();
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

  it('keeps the written division form LTR on the Hebrew page', async () => {
    await i18n.changeLanguage('he');
    const { container } = renderWithProviders(<CargoStationPage />);
    shareEvenly(container, 2);
    fireEvent.click(checkSplitButton()!);

    const equation = container.querySelector('.cs-equation-text');
    expect(equation).toHaveAttribute('dir', 'ltr');
    expect(equation?.textContent).toContain('6 ÷ 3 =');
  });
});
