import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AnglesConstructPage } from '../AnglesConstructPage';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';

function startBasic() {
  renderWithProviders(<AnglesConstructPage />);
  fireEvent.click(screen.getByTestId('tr-start'));
}

/** jsdom doesn't lay out SVG, so every element reports a zero-size bounding rect; stub a realistic one so the drag math in `useDragHandle` can run. */
function stubStageBoundingRect() {
  const stage = document.querySelector('.geo-stage') as SVGSVGElement;
  stage.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 320, height: 320, right: 320, bottom: 320, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return stage;
}

describe('Construct an Angle training activity (drag lab)', () => {
  afterEach(async () => {
    await resetLanguage();
  });

  it('offers practice levels and three difficulty tiers, with a shorter question-count range', async () => {
    await useLanguage('en');
    renderWithProviders(<AnglesConstructPage />);
    expect(screen.getByText('Construct an Angle')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders a draggable handle, a fixed ray, a moving ray and a live degree readout', async () => {
    await useLanguage('en');
    startBasic();
    expect(screen.getByTestId('geo-construct-fixed-ray')).toBeInTheDocument();
    expect(screen.getByTestId('geo-construct-draggable-ray')).toBeInTheDocument();
    expect(screen.getByTestId('geo-construct-handle')).toBeInTheDocument();
    expect(screen.getByTestId('angles-construct-readout').textContent).toMatch(/\d+°/);
  });

  it('dragging the handle updates the live angle reading, and Check grades the current angle', async () => {
    await useLanguage('en');
    startBasic();
    stubStageBoundingRect();

    const handle = screen.getByTestId('geo-construct-handle');
    const before = screen.getByTestId('angles-construct-readout').textContent;

    fireEvent.pointerDown(handle, { clientX: 160, clientY: 160, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 260, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 260, clientY: 60, pointerId: 1 });

    const after = screen.getByTestId('angles-construct-readout').textContent;
    expect(after).not.toBe(before);

    fireEvent.click(screen.getByTestId('angles-construct-check'));
    const feedback = document.querySelector('.angles7-feedback');
    expect(feedback).toBeInTheDocument();
    expect(feedback?.textContent).not.toBe('');
  });

  it('forces the live readout and prompt text to stay readable on a Hebrew RTL page', async () => {
    await useLanguage('he');
    startBasic();
    expect(screen.getByTestId('angles-construct-readout')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('anglesGrade7.');
  });
});
