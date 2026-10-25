import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { GeometryGrade7Page } from '../GeometryGrade7Page';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

describe('Grade 7 Geometry (Angles) topic listing', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('lists all five Angles activities with working links', async () => {
    await useLanguage('en');
    renderWithProviders(<GeometryGrade7Page />);
    expect(screen.getByText('Geometry – Angles')).toBeInTheDocument();
    const expected: [string, string][] = [
      ['Rays & Angles', '/grade/7/geometry/rays-and-angles'],
      ['Angle Types', '/grade/7/geometry/angle-types'],
      ['Angle Notation', '/grade/7/geometry/angle-notation'],
      ['Compare Angles', '/grade/7/geometry/compare-angles'],
      ['Construct an Angle', '/grade/7/geometry/construct-an-angle'],
    ];
    for (const [name, path] of expected) {
      expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', path);
    }
  });

  it('is reachable and readable on the Hebrew RTL page with no raw i18n keys leaking', async () => {
    await useLanguage('he');
    renderWithProviders(<GeometryGrade7Page />);
    expect(screen.getByText('גאומטריה – זוויות')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('anglesGrade7.');
    expect(document.body.textContent).not.toContain('geometryGrade7Page.');
  });
});
