import { act, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/testUtils';
import { BlockBuildersPage } from '../BlockBuildersPage';

vi.mock('../../data/games/blockBuildersData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/blockBuildersData')>();
  return {
    ...original,
    BLOCK_BUILDERS_MISSION_COUNT: 2,
    buildBlockBuildersSession: () => [
      {
        id: 'build-2x3',
        kind: 'buildArray',
        rows: 2,
        columns: 3,
        product: 6,
        choices: [6],
      },
      {
        id: 'match-3x2',
        kind: 'matchBuild',
        rows: 3,
        columns: 2,
        product: 6,
        choices: [6],
        intentionalReverse: true,
        buildOptions: [
          { id: '2x3', rows: 2, columns: 3 },
          { id: '3x2', rows: 3, columns: 2 },
          { id: '4x2', rows: 4, columns: 2 },
        ],
      },
    ],
  };
});

describe('Block Builders gameplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('he');
  });

  it('builds the selected dimensions, advances only after success, and completes', () => {
    const { container } = renderWithProviders(<BlockBuildersPage />);
    const groups = container.querySelectorAll('.bb-choice-group');
    fireEvent.click(within(groups[0] as HTMLElement).getByRole('button', { name: '2' }));
    fireEvent.click(within(groups[1] as HTMLElement).getByRole('button', { name: '3' }));

    expect(screen.getByTestId('main-array').querySelectorAll('[data-block="visible"]')).toHaveLength(6);
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('blockBuilders.feedback.correct.title'));
    act(() => vi.advanceTimersByTime(1300));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    const cards = container.querySelectorAll('.bb-build-card');
    fireEvent.click(cards[0]);
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('blockBuilders.feedback.reversed.title'));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('status').textContent).toContain('2 × 3 = 6');
    expect(screen.getByRole('status').textContent).toContain('3 × 2 = 6');

    fireEvent.click(cards[1]);
    act(() => vi.advanceTimersByTime(1300));
    expect(screen.getByText(i18n.t('blockBuilders.completion.title'))).toBeInTheDocument();
  });

  it.each(['he', 'en'] as const)('renders localized game UI in %s without raw keys', async (language) => {
    await i18n.changeLanguage(language);
    const { container } = renderWithProviders(<BlockBuildersPage />);
    expect(screen.getByRole('heading', { level: 1, name: i18n.t('blockBuilders.gameName') })).toBeInTheDocument();
    expect(container.textContent).not.toContain('blockBuilders.');
  });
});
