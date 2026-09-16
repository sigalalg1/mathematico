import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { GEOMETRY_ACTIVITY_IDS } from '../../data/games/geometryAnglesTrianglesData';
import i18n from '../../i18n';
import { renderWithProviders } from '../../test/testUtils';
import { classifyAngle } from '../../utils/geometry';

afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('he');
});

describe('Grade 3 geometry unit', () => {
  it.each(GEOMETRY_ACTIVITY_IDS)('renders functional direct geometry for %s', (activityId) => {
    const { container } = renderWithProviders(<App />, [`/grade/3/geometry-angles-triangles/${activityId}`]);
    expect(container.querySelector('.geo-scene')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getAllByTestId(/geometry-(angle|triangle)/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1);
  });

  it('keeps an incorrect angle answer, then advances after a correct retry', () => {
    vi.useFakeTimers();
    renderWithProviders(<App />, ['/grade/3/geometry-angles-triangles/angle-types']);
    const degrees = Number(screen.getByTestId('geometry-angle').getAttribute('aria-label')!.match(/\d+/)![0]);
    const correct = classifyAngle(degrees);
    const wrong = correct === 'acute' ? 'obtuse' : 'acute';
    fireEvent.click(screen.getByRole('button', { name: i18n.t(`geometry.angleTypes.${wrong}`) }));
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('geometry.feedback.retry'));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    fireEvent.click(screen.getByRole('button', { name: i18n.t(`geometry.angleTypes.${correct}`) }));
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('geometry.feedback.correct'));
    act(() => vi.advanceTimersByTime(651));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });

  it('exposes Grade 3 as one topic and all 12 activities in order', () => {
    renderWithProviders(<App />, ['/grade/3']);
    expect(screen.getByText(i18n.t('topics.geometryAnglesTriangles.name'))).toBeInTheDocument();
    renderWithProviders(<App />, ['/grade/3/geometry-angles-triangles']);
    const tiles = screen.getAllByRole('link').filter((link) => link.classList.contains('atile'));
    expect(tiles).toHaveLength(GEOMETRY_ACTIVITY_IDS.length);
    GEOMETRY_ACTIVITY_IDS.forEach((activityId, index) => {
      expect(tiles[index].querySelector('.atile-index')).toHaveTextContent(`${index + 1}.`);
      expect(tiles[index].querySelector('.atile-title')).toHaveTextContent(
        i18n.t(`geometry.activities.${activityId}.name`),
      );
    });
  });

  it('renders English labels while keeping SVG geometry LTR', async () => {
    await i18n.changeLanguage('en');
    const { container } = renderWithProviders(<App />, ['/grade/3/geometry-angles-triangles/build-an-angle']);
    expect(screen.getByRole('heading', { name: 'Build an Angle' })).toBeInTheDocument();
    expect(container.querySelector('.geo-angle')).toHaveStyle({ direction: 'ltr' });
  });
});
