import { expect, type Locator, type Page } from '@playwright/test';

const GRID_MIN = -5;
const GRID_MAX = 5;
const PADDING = 1.5;
const WORLD = GRID_MAX - GRID_MIN + PADDING * 2;

/** Clicks a world coordinate on the CoordinateGrid, mirroring its own projection. */
export async function clickGrid(page: Page, x: number, y: number): Promise<void> {
  const catcher = page.locator('.grid-click-catcher');
  const box = await catcher.boundingBox();
  if (!box) throw new Error('coordinate grid is not clickable on this screen');
  await catcher.click({
    position: {
      x: ((x - GRID_MIN + PADDING) / WORLD) * box.width,
      y: box.height - ((y - GRID_MIN + PADDING) / WORLD) * box.height,
    },
  });
}

/** Reads an ordered pair like "(-2, 3)" out of a locator's text. */
export async function readPair(locator: Locator): Promise<{ x: number; y: number }> {
  const text = (await locator.innerText()).replace(/\s/g, '');
  const match = /\((-?\d+),(-?\d+)\)/.exec(text);
  if (!match) throw new Error(`could not read an ordered pair from "${text}"`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

export async function expectProgress(page: Page, current: number): Promise<void> {
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(current));
}

export const routes = {
  home: '/',
  grade7: '/grade/7',
  topic: '/grade/7/coordinate-system',
  hitTheTarget: '/grade/7/coordinate-system/hit-the-target',
  findThePoint: '/grade/7/coordinate-system/find-the-point',
  distances: '/grade/7/coordinate-system/distances-segments',
  drawByCoordinates: '/grade/7/coordinate-system/draw-by-coordinates',
  detective: '/grade/7/coordinate-system/coordinate-detective',
};
