import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AnglesIdentifyPage } from '../AnglesIdentifyPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<AnglesIdentifyPage />);
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Rays & Angles training activity', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('renders a diagram and at least one interactive way to answer (a clickable point, angle, or option button)', async () => {
    await useLanguage('en');
    startBasic();
    expect(document.querySelector('.geo-stage')).toBeInTheDocument();
    const clickableHandles = document.querySelectorAll('.geo-handle-hit');
    const optionButtons = document.querySelectorAll('.angles7-option');
    expect(clickableHandles.length + optionButtons.length).toBeGreaterThan(0);
  });

  it('tapping an answer (point, angle handle, or option) produces feedback text', async () => {
    await useLanguage('en');
    startBasic();
    const handle = document.querySelector<SVGElement>('.geo-handle-hit');
    const optionButton = document.querySelector<HTMLButtonElement>('.angles7-option');
    if (handle) fireEvent.click(handle);
    else if (optionButton) fireEvent.click(optionButton);
    else throw new Error('expected at least one interactive control to answer with');
    expect(document.querySelector('.angles7-feedback')).toBeInTheDocument();
  });

  it('every ray/point/angle label stays LTR on the Hebrew RTL page', async () => {
    await useLanguage('he');
    startBasic();
    const stage = document.querySelector('.geo-stage');
    expect(stage).toHaveAttribute('style', expect.stringContaining('ltr'));
  });
});
