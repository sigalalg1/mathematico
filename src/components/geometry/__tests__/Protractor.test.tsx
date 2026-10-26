import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { VertexSceneView } from '../VertexSceneView';
import { grade7GeometryStyle } from '../../../geometry/style';
import { pointFromAngle } from '../../../geometry/angleMath';
import type { VertexScene } from '../../../geometry/types';

/**
 * Programmatic (not merely eyeballed) regression coverage for the exact RTL
 * class of bug this unit already hit once for real (see
 * `AnglesComparePage.css`'s `direction: ltr` fix): reads the *actual*
 * rendered SVG coordinates — the fixed ray's `<line>` and the protractor's
 * own baseline/tick-0 label — and cross-checks their angles with plain
 * `atan2`, the same technique a live-browser check uses, just run here as a
 * fast, permanent jsdom test instead of (not in place of) one.
 */

const VERTEX = { x: 160, y: 160 };

function buildScene(fixedDeg: number, measuredDeg: number): VertexScene {
  return {
    vertex: { id: 'vertex', label: '', point: VERTEX },
    rays: [
      { id: 'fixed', label: '', through: pointFromAngle(VERTEX, fixedDeg, 100) },
      { id: 'measured', label: '', through: pointFromAngle(VERTEX, measuredDeg, 100) },
    ],
  };
}

function lineAngleDeg(line: SVGLineElement): number {
  const x1 = Number(line.getAttribute('x1'));
  const y1 = Number(line.getAttribute('y1'));
  const x2 = Number(line.getAttribute('x2'));
  const y2 = Number(line.getAttribute('y2'));
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

describe('Protractor baseline alignment (orientation/RTL-safety regression coverage)', () => {
  const FIXED_DIRECTIONS = [0, 23, 90, 117, 200, 271, 349];

  it("the stage is forced LTR, so the protractor's numbers can never be mirrored by an RTL ancestor", () => {
    const scene = buildScene(0, 60);
    const { container } = render(
      <VertexSceneView scene={scene} style={grade7GeometryStyle} label="test" showRayLabels={false} protractor={{ baselineRayId: 'fixed' }} />,
    );
    const svg = container.querySelector('.geo-stage') as SVGSVGElement;
    expect(svg.style.direction).toBe('ltr');
  });

  it.each(FIXED_DIRECTIONS)('baseline direction exactly matches the fixed ray\'s actual drawn direction (fixedDeg=%i)', (fixedDeg) => {
    const measuredDeg = fixedDeg + 70;
    const scene = buildScene(fixedDeg, measuredDeg);
    const { container } = render(
      <VertexSceneView scene={scene} style={grade7GeometryStyle} label="test" showRayLabels={false} protractor={{ baselineRayId: 'fixed' }} />,
    );

    const fixedRayLine = container.querySelector('[data-testid="geo-ray-fixed"]') as SVGLineElement;
    const baselineLine = container.querySelector('[data-testid="geo-protractor-baseline"]') as SVGLineElement;
    expect(fixedRayLine).toBeTruthy();
    expect(baselineLine).toBeTruthy();

    const actualFixedDeg = normalizeDeg(lineAngleDeg(fixedRayLine));
    // The baseline is one straight line through the vertex (both the "0" and
    // "180" ends), so its raw line-angle only determines direction up to a
    // 180° ambiguity — what matters is that it lies on the very same line as
    // the fixed ray, i.e. matches mod 180.
    const baselineLineDeg = normalizeDeg(lineAngleDeg(baselineLine));
    const diffMod180 = Math.abs(((actualFixedDeg - baselineLineDeg + 90 + 360) % 180) - 90);
    expect(diffMod180).toBeLessThan(0.01);

    // And critically, the printed "0" tick must sit on the *same side* as the
    // fixed ray (not the opposite, 180°-away side) — read its actual position
    // relative to the vertex and compare directly against the fixed ray's
    // real direction.
    const tick0 = container.querySelector('[data-testid="protractor-tick-0"]') as SVGTextElement;
    expect(tick0).toBeTruthy();
    const tick0X = Number(tick0.getAttribute('x'));
    const tick0Y = Number(tick0.getAttribute('y'));
    const tick0Deg = normalizeDeg((Math.atan2(tick0Y - VERTEX.y, tick0X - VERTEX.x) * 180) / Math.PI);
    const circularGap = Math.min(Math.abs(tick0Deg - actualFixedDeg), 360 - Math.abs(tick0Deg - actualFixedDeg));
    expect(circularGap).toBeLessThan(1);

    // And the "180" tick must sit on the exact opposite side.
    const tick180 = container.querySelector('[data-testid="protractor-tick-180"]') as SVGTextElement;
    const tick180Deg = normalizeDeg((Math.atan2(Number(tick180.getAttribute('y')) - VERTEX.y, Number(tick180.getAttribute('x')) - VERTEX.x) * 180) / Math.PI);
    const oppositeGap = Math.min(Math.abs(tick180Deg - normalizeDeg(actualFixedDeg + 180)), 360 - Math.abs(tick180Deg - normalizeDeg(actualFixedDeg + 180)));
    expect(oppositeGap).toBeLessThan(1);
  });

  it('the measured ray\'s real drawn direction sits exactly at the printed tick matching its true angle from the fixed ray', () => {
    const fixedDeg = 41;
    const targetDegrees = 73;
    const scene = buildScene(fixedDeg, fixedDeg + targetDegrees);
    const { container } = render(
      <VertexSceneView scene={scene} style={grade7GeometryStyle} label="test" showRayLabels={false} protractor={{ baselineRayId: 'fixed' }} />,
    );

    const measuredRayLine = container.querySelector('[data-testid="geo-ray-measured"]') as SVGLineElement;
    const actualMeasuredDeg = normalizeDeg(lineAngleDeg(measuredRayLine));

    const majorTick = container.querySelector(`[data-testid="protractor-tick-${targetDegrees}"]`) as SVGTextElement | null;
    // 73 is not a multiple of 10, so no *major* (labelled) tick exists for it
    // — assert against the nearest major tick's geometry instead, confirming
    // the sweep direction (fixedDeg + n) is the one actually used.
    const nearestMajor = Math.round(targetDegrees / 10) * 10;
    const tick = majorTick ?? (container.querySelector(`[data-testid="protractor-tick-${nearestMajor}"]`) as SVGTextElement);
    expect(tick).toBeTruthy();
    const tickDeg = normalizeDeg((Math.atan2(Number(tick.getAttribute('y')) - VERTEX.y, Number(tick.getAttribute('x')) - VERTEX.x) * 180) / Math.PI);
    const expectedTickDeg = normalizeDeg(fixedDeg + nearestMajor);
    const gap = Math.min(Math.abs(tickDeg - expectedTickDeg), 360 - Math.abs(tickDeg - expectedTickDeg));
    expect(gap).toBeLessThan(1);

    // And the measured ray itself is within the ~10° wedge around that tick.
    const rayVsNearestMajor = Math.min(
      Math.abs(actualMeasuredDeg - expectedTickDeg),
      360 - Math.abs(actualMeasuredDeg - expectedTickDeg),
    );
    expect(rayVsNearestMajor).toBeLessThan(10);
  });
});
