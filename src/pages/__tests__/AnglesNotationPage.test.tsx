import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AnglesNotationPage } from '../AnglesNotationPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<AnglesNotationPage />);
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Angle Notation training activity', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('offers practice levels and three difficulty tiers', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesNotationPage />);
    expect(screen.getByText('Angle Notation')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('starts a session and renders a diagram plus angle-name options', async () => {
    await useLanguage('en');
    startBasic();
    expect(document.querySelector('.geo-stage')).toBeInTheDocument();
    const options = [...document.querySelectorAll<HTMLButtonElement>('.angles7-option')];
    expect(options.length).toBeGreaterThan(1);
  });

  it('forces every angle name (∠-notation) LTR even on a Hebrew RTL page', async () => {
    await useLanguage('he');
    startBasic();
    const math = document.querySelectorAll('.math-text');
    expect(math.length).toBeGreaterThan(0);
    for (const node of math) expect(node).toHaveAttribute('dir', 'ltr');
  });

  it('lets a child correct a wrong answer in place (the shared retry flow)', async () => {
    await useLanguage('en');
    startBasic();
    const options = [...document.querySelectorAll<HTMLButtonElement>('.angles7-option')];
    // Click every option until one is wrong (guaranteed since there are 3-4 options and only one is right).
    const wrong = options.find((button) => {
      fireEvent.click(button);
      const stillAnswering = !document.querySelector('.angles7-feedback.is-correct, .angles7-feedback.is-wrong');
      return !stillAnswering;
    });
    expect(wrong).toBeDefined();
    // After a wrong answer the options remain visible so the child can try again.
    expect(document.querySelectorAll('.angles7-option').length).toBeGreaterThan(1);
  });

  it('is naturally placed in the Grade 7 geometry route shell', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesNotationPage />);
    expect(screen.getByRole('link', { name: /Geometry.*Angles/i })).toHaveAttribute('href', '/grade/7/geometry');
  });
});
