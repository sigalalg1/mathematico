import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AbsoluteValuePage } from '../AbsoluteValuePage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<AbsoluteValuePage />);
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Absolute Value training activity', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('offers practice levels and 5/10/20 questions without a speed challenge', async () => {
    await useLanguage('en');
    renderWithProviders(<AbsoluteValuePage />);
    expect(screen.getByText('Absolute Value')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.queryByText(/personal challenge/i)).not.toBeInTheDocument();
  });

  it('starts with distance from zero and an interactive retry flow', async () => {
    await useLanguage('en');
    startBasic();
    expect(screen.getByText('Absolute value is distance from zero')).toBeInTheDocument();
    expect(document.querySelector('.number-line')).toHaveAttribute('dir', 'ltr');
    const options = [...document.querySelectorAll<SVGGElement>('.number-line-point')];
    expect(options.length).toBeGreaterThan(1);
    fireEvent.click(options.find((button) => button.getAttribute('aria-label') !== '0') ?? options[0]);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('forces every mathematical expression LTR on a Hebrew page', async () => {
    await useLanguage('he');
    startBasic();
    const math = document.querySelectorAll('.math-text');
    expect(math.length).toBeGreaterThan(0);
    for (const node of math) expect(node).toHaveAttribute('dir', 'ltr');
    expect(document.body.textContent).not.toContain('absoluteValue.');
  });

  it('is naturally placed in the signed-numbers route shell', async () => {
    await useLanguage('en');
    renderWithProviders(<AbsoluteValuePage />);
    expect(screen.getByRole('link', { name: /Signed Numbers/i })).toHaveAttribute('href', '/grade/7/signed-numbers');
  });
});
