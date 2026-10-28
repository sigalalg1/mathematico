import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Geo4MeasurementPage } from '../Geo4MeasurementPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<Geo4MeasurementPage />);
  fireEvent.click(screen.getByTestId('geo-lesson-skip'));
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Perimeter, Area & Measurement training activity', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('renders a diagram and at least one interactive way to answer', async () => {
    await useLanguage('en');
    startBasic();
    expect(document.querySelector('.geo-stage')).toBeInTheDocument();
    const controls = document.querySelectorAll('.geo4-option, .geo4-gallery-item');
    expect(controls.length).toBeGreaterThan(0);
  });

  it('tapping an answer produces feedback text', async () => {
    await useLanguage('en');
    startBasic();
    const optionButton = document.querySelector<HTMLButtonElement>('.geo4-option');
    const galleryButton = document.querySelector<HTMLButtonElement>('.geo4-gallery-item');
    if (optionButton) fireEvent.click(optionButton);
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
