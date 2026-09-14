import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { fireEvent } from '@testing-library/react';
import { AuthProvider } from '../auth/AuthContext';
import i18n from '../i18n';

interface ProvidersProps {
  children: ReactNode;
  initialEntries?: string[];
}

function Providers({ children, initialEntries = ['/'] }: ProvidersProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

/** Renders a component inside the same providers the real app uses. */
export function renderWithProviders(ui: ReactElement, initialEntries?: string[]): RenderResult {
  return render(<Providers initialEntries={initialEntries}>{ui}</Providers>);
}

/** Switches the app language for a test and restores Hebrew afterwards via resetLanguage(). */
export async function useLanguage(language: 'he' | 'en'): Promise<void> {
  await i18n.changeLanguage(language);
}

export async function resetLanguage(): Promise<void> {
  await i18n.changeLanguage('he');
}

// --- CoordinateGrid click helpers -------------------------------------------
// Mirrors the projection inside CoordinateGrid so tests can click a *world*
// coordinate rather than guessing pixel values.
const VIEW_SIZE = 320;
const PADDING = 1.5;
const GRID_MIN = -5;
const GRID_MAX = 5;
const SCALE = VIEW_SIZE / (GRID_MAX - GRID_MIN + PADDING * 2);

export function gridClientPoint(x: number, y: number): { clientX: number; clientY: number } {
  return {
    clientX: (x - GRID_MIN + PADDING) * SCALE,
    clientY: VIEW_SIZE - (y - GRID_MIN + PADDING) * SCALE,
  };
}

/** Finds the transparent click-catcher rect the CoordinateGrid renders when it is clickable. */
export function getGridClickCatcher(container: HTMLElement): Element {
  const catcher = container.querySelector('.grid-click-catcher');
  if (!catcher) throw new Error('CoordinateGrid is not clickable (no .grid-click-catcher rendered)');
  return catcher;
}

/** Clicks the coordinate plane at the given world coordinate. */
export function clickGridAt(container: HTMLElement, x: number, y: number): void {
  fireEvent.click(getGridClickCatcher(container), gridClientPoint(x, y));
}
