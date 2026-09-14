import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// jsdom has no layout engine, so every SVG element reports a 0x0 box. The
// CoordinateGrid converts click coordinates using getBoundingClientRect, so
// give it a stable 320x320 box matching the SVG viewBox. Tests can then click
// a world coordinate by computing its screen position with gridClientPoint().
const VIEW_SIZE = 320;

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: VIEW_SIZE,
      bottom: VIEW_SIZE,
      width: VIEW_SIZE,
      height: VIEW_SIZE,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

afterEach(() => {
  cleanup();
});
