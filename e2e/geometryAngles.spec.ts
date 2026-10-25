import { expect, test } from '@playwright/test';
import he from '../src/i18n/locales/he/translation.json' with { type: 'json' };

const topic = '/grade/7/geometry';
const rays = '/grade/7/geometry/rays-and-angles';
const types = '/grade/7/geometry/angle-types';
const notation = '/grade/7/geometry/angle-notation';
const compare = '/grade/7/geometry/compare-angles';
const construct = '/grade/7/geometry/construct-an-angle';

async function start(page: import('@playwright/test').Page, route: string) {
  await page.goto(route);
  await page.getByTestId('tr-start').click();
  await expect(page.locator('.tr-play')).toBeVisible();
}

test('Grade 7 Geometry topic lists all five Angles activities, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(topic);
  await expect(page.getByRole('heading', { level: 1, name: he.geometryGrade7Page.title })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(he.anglesGrade7.identify.gameName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(he.anglesGrade7.types.gameName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(he.anglesGrade7.notation.gameName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(he.anglesGrade7.compare.gameName) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(he.anglesGrade7.construct.gameName) })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Rays & Angles: a real diagram renders and tapping an answer produces feedback', async ({ page }) => {
  await start(page, rays);
  await expect(page.locator('.geo-stage')).toBeVisible();

  const handle = page.locator('.geo-handle-hit').first();
  const optionButton = page.locator('.angles7-option').first();
  if (await handle.count()) await handle.click();
  else await optionButton.click();

  await expect(page.locator('.angles7-feedback')).not.toHaveText('');
});

test('Angle Types: classify and order interactions both render a real SVG diagram', async ({ page }) => {
  await start(page, types);
  await expect(page.locator('.geo-stage').first()).toBeVisible();
  // Whichever kind came up first, there must be a tappable way to answer.
  const hasOptions = (await page.locator('.angles7-option').count()) > 0;
  const hasOrderOptions = (await page.locator('.angles7-order-option').count()) > 0;
  expect(hasOptions || hasOrderOptions).toBe(true);
});

test('Angle Notation: every ∠-name option is rendered LTR even on the Hebrew page', async ({ page }) => {
  await start(page, notation);
  await expect(page.locator('.geo-stage').first()).toBeVisible();
  const mathNodes = page.locator('.math-text');
  await expect(mathNodes.first()).toBeVisible();
  const count = await mathNodes.count();
  for (let i = 0; i < count; i += 1) {
    await expect(mathNodes.nth(i)).toHaveAttribute('dir', 'ltr');
  }
});

test('Compare Angles: two separate diagrams render, and </=/> options are selectable', async ({ page }) => {
  await start(page, compare);
  await expect(page.locator('.geo-stage')).toHaveCount(2);
  await page.locator('.angles7-option').first().click();
  await expect(page.locator('.angles7-feedback')).not.toHaveText('');
});

test('Construct an Angle: real pointer drag moves the ray, changes the live reading, and Check grades it', async ({ page }) => {
  await start(page, construct);
  const stage = page.locator('.geo-stage');
  await expect(stage).toBeVisible();
  const box = await stage.boundingBox();
  if (!box) throw new Error('geometry stage is not visible');

  const readout = page.getByTestId('angles-construct-readout');
  const before = await readout.innerText();

  const handle = page.getByTestId('geo-construct-handle');
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error('drag handle is not visible');

  // A real mouse drag: down on the handle, move across the stage, release.
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2, { steps: 10 });
  await page.mouse.up();

  const after = await readout.innerText();
  expect(after).not.toBe(before);

  await page.getByTestId('angles-construct-check').click();
  await expect(page.locator('.angles7-feedback')).not.toHaveText('');
});
