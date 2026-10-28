import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AnglesMeasurePage } from '../AnglesMeasurePage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<AnglesMeasurePage />);
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Measure an Angle training activity (digital protractor)', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('offers practice levels and three difficulty tiers', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesMeasurePage />);
    expect(screen.getByText('Measure an Angle')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('renders the scene, a protractor overlay with its full tick range, and a numeric input', async () => {
    await useLanguage('en');
    startBasic();
    expect(document.querySelector('.geo-stage')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="geo-protractor"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="protractor-tick-0"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="protractor-tick-180"]')).toBeInTheDocument();
    expect(screen.getByTestId('angles-measure-input')).toBeInTheDocument();
  });

  it('never leaks the correct answer onto the protractor itself (no colored angle arc overlay)', async () => {
    await useLanguage('en');
    startBasic();
    // Unlike the other Grade 7 Angles scenes, this one must never render a
    // `geo-angle-arc` — that would shade/color the exact wedge being asked
    // about, which is the one thing a real protractor reading task may not do.
    expect(document.querySelector('.geo-angle-arc')).not.toBeInTheDocument();
  });

  it('typing a value and checking grades it, and shows feedback either way', async () => {
    await useLanguage('en');
    startBasic();
    const input = screen.getByTestId('angles-measure-input');
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.click(screen.getByTestId('angles-measure-check'));
    const feedback = document.querySelector('.angles7-feedback');
    expect(feedback).toBeInTheDocument();
    expect(feedback?.textContent).not.toBe('');
  });

  it('forces the protractor stage LTR and keeps the prompt readable on a Hebrew RTL page', async () => {
    await useLanguage('he');
    startBasic();
    const stage = document.querySelector('.geo-stage') as HTMLElement;
    expect(stage).toBeInTheDocument();
    expect(stage.style.direction).toBe('ltr');
    expect(document.body.textContent).not.toContain('anglesGrade7.');
  });

  it('is naturally placed in the Grade 7 geometry route shell', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesMeasurePage />);
    expect(screen.getByRole('link', { name: /Geometry.*Angles/i })).toHaveAttribute('href', '/grade/7/geometry');
  });
});
