import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Grade4GeometryFoundationsPage } from '../Grade4GeometryFoundationsPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

describe('Grade 4 Geometry Foundations topic listing', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('lists all five learning-group activities with working links', async () => {
    await useLanguage('en');
    renderWithProviders(<Grade4GeometryFoundationsPage />);
    expect(screen.getByText('Learning the Language of Geometry')).toBeInTheDocument();
    const expected: [string, string][] = [
      ['Points, Segments & Polygons', '/grade/4/geometry-foundations/points-segments-polygons'],
      ['Learning About Angles', '/grade/4/geometry-foundations/angles'],
      ['Sides, Vertices & Diagonals', '/grade/4/geometry-foundations/sides-vertices-diagonals'],
      ['The Polygon Family', '/grade/4/geometry-foundations/polygon-family'],
      ['Perimeter, Area & Measurement', '/grade/4/geometry-foundations/perimeter-area-units'],
    ];
    for (const [name, path] of expected) {
      expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', path);
    }
  });

  it('is reachable and readable on the Hebrew RTL page with no raw i18n keys leaking', async () => {
    await useLanguage('he');
    renderWithProviders(<Grade4GeometryFoundationsPage />);
    expect(screen.getByText('מכירים את שפת הגיאומטריה')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('grade4Geometry.');
    expect(document.body.textContent).not.toContain('grade4GeometryFoundationsPage.');
  });
});
