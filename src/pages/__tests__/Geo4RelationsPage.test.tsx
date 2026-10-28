import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Geo4RelationsPage } from '../Geo4RelationsPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<Geo4RelationsPage />);
  fireEvent.click(screen.getByTestId('geo-lesson-skip'));
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Sides, Vertices & Diagonals training activity', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('renders a diagram and at least one interactive way to answer', async () => {
    await useLanguage('en');
    startBasic();
    expect(document.querySelector('.geo-stage')).toBeInTheDocument();
    const controls = document.querySelectorAll('.geo-handle-hit, .geo4-option');
    expect(controls.length).toBeGreaterThan(0);
  });

  it('tapping an answer produces feedback text', async () => {
    await useLanguage('en');
    startBasic();
    const handle = document.querySelector<SVGElement>('.geo-handle-hit');
    const optionButton = document.querySelector<HTMLButtonElement>('.geo4-option');
    if (handle) fireEvent.click(handle);
    else if (optionButton) fireEvent.click(optionButton);
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
