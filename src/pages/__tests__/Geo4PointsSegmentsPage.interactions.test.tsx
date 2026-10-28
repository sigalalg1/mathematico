import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Geo4PointsSegmentsPage } from '../Geo4PointsSegmentsPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

// At "advanced" difficulty, Group 1's kind pool starts with 'selectAllSides'
// (see KIND_POOL in `grade4GeoPointsData.ts`), so picking that difficulty
// lands directly on a multi-select question as question 1 — no need to
// advance through earlier questions first.
function startAdvancedMultiSelect() {
  renderWithProviders(<Geo4PointsSegmentsPage />);
  fireEvent.click(screen.getByTestId('geo-lesson-skip'));
  fireEvent.click(screen.getByTestId('tr-difficulty-advanced'));
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Points, Segments & Polygons — multi-select ("select all") interaction', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('lands on a selectAllSides question and requires selecting every side before the confirm button is enabled', async () => {
    await useLanguage('en');
    startAdvancedMultiSelect();
    expect(document.querySelector('.geo4-scene[data-kind="selectAllSides"]')).toBeInTheDocument();

    const confirmButton = screen.getByTestId('geo4-confirm-selection');
    expect(confirmButton).toBeDisabled();

    const handles = Array.from(document.querySelectorAll<SVGElement>('.geo-handle-hit'));
    expect(handles.length).toBeGreaterThan(2);

    // Select only the first side and confirm — an incomplete selection must be marked wrong.
    fireEvent.click(handles[0]);
    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);
    expect(document.querySelector('.geo4-feedback.is-wrong')).toBeInTheDocument();
  });

  it('selecting every side and confirming answers correctly', async () => {
    await useLanguage('en');
    startAdvancedMultiSelect();
    const handles = Array.from(document.querySelectorAll<SVGElement>('.geo-handle-hit'));
    handles.forEach((handle) => fireEvent.click(handle));
    fireEvent.click(screen.getByTestId('geo4-confirm-selection'));
    expect(document.querySelector('.geo4-feedback.is-correct')).toBeInTheDocument();
  });

  it('clicking a handle twice toggles it back off (deselect)', async () => {
    await useLanguage('en');
    startAdvancedMultiSelect();
    const handles = Array.from(document.querySelectorAll<SVGElement>('.geo-handle-hit'));
    fireEvent.click(handles[0]);
    fireEvent.click(handles[0]);
    const confirmButton = screen.getByTestId('geo4-confirm-selection');
    expect(confirmButton).toBeDisabled();
  });
});
