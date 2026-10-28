import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Geo4PointsSegmentsPage } from '../Geo4PointsSegmentsPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<Geo4PointsSegmentsPage />);
  // The lesson screen comes first — skip straight to practice for these interaction tests.
  fireEvent.click(screen.getByTestId('geo-lesson-skip'));
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Points, Segments & Polygons training activity', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('shows the guided lesson before practice, with a working "next" step', async () => {
    await useLanguage('en');
    renderWithProviders(<Geo4PointsSegmentsPage />);
    expect(screen.getByTestId('geo-lesson-flow')).toBeInTheDocument();
    expect(document.querySelector('.concept-intro-term')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('geo-lesson-next'));
    // Still on the lesson (more steps remain), with a fresh concept card.
    expect(screen.getByTestId('geo-lesson-flow')).toBeInTheDocument();
  });

  it('renders an interactive diagram once practice starts', async () => {
    await useLanguage('en');
    startBasic();
    expect(document.querySelector('.geo-stage')).toBeInTheDocument();
    const interactiveControls = document.querySelectorAll('.geo-handle-hit, .geo4-option, .geo4-gallery-item');
    expect(interactiveControls.length).toBeGreaterThan(0);
  });

  it('tapping an answer produces feedback text', async () => {
    await useLanguage('en');
    startBasic();
    const handle = document.querySelector<SVGElement>('.geo-handle-hit');
    const optionButton = document.querySelector<HTMLButtonElement>('.geo4-option');
    const galleryButton = document.querySelector<HTMLButtonElement>('.geo4-gallery-item');
    if (handle) fireEvent.click(handle);
    else if (optionButton) fireEvent.click(optionButton);
    else if (galleryButton) fireEvent.click(galleryButton);
    else throw new Error('expected at least one interactive control to answer with');
    expect(document.querySelector('.geo4-feedback')).toBeInTheDocument();
  });

  it('every diagram stays LTR on the Hebrew RTL page', async () => {
    await useLanguage('he');
    startBasic();
    const stage = document.querySelector('.geo-stage');
    expect(stage).toHaveAttribute('style', expect.stringContaining('ltr'));
  });
});
