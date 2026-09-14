import { expect, test } from '@playwright/test';
import { clickGrid, expectProgress, readPair, routes } from './helpers';
import he from '../src/i18n/locales/he/translation.json' with { type: 'json' };
import en from '../src/i18n/locales/en/translation.json' with { type: 'json' };

// Each Playwright test gets a fresh browser context, so localStorage starts empty
// and every flow begins as a guest in the default (Hebrew) language.

test('1 — navigates home → Grade 7 → Coordinate System → a game', async ({ page }) => {
  await page.goto(routes.home);
  await expect(page.getByRole('heading', { level: 1, name: he.app.title })).toBeVisible();

  await page.getByRole('link').filter({ hasText: he.grades['7'] }).click();
  await expect(page).toHaveURL(/\/grade\/7$/);

  await page.getByRole('link').filter({ hasText: he.topics.coordinateSystem.name }).click();
  await expect(page).toHaveURL(/\/coordinate-system$/);

  await page.getByRole('link').filter({ hasText: he.games.hitTheTarget.name }).click();
  await expect(page).toHaveURL(/\/hit-the-target$/);
  await expect(page.getByText(he.hitTheTarget.prompt)).toBeVisible();
  await expectProgress(page, 1);
});

test('2 — a wrong answer does not advance, and the student can retry in place', async ({ page }) => {
  await page.goto(routes.distances);
  await expectProgress(page, 1);

  const answer = page.getByRole('textbox');
  const check = page.getByRole('button', { name: he.distancesSegments.actions.check });

  // The grid only spans -5..5, so 99 is always wrong.
  await answer.fill('99');
  await check.click();
  await expect(page.getByText(he.distancesSegments.feedback.incorrectHint)).toBeVisible();
  await expectProgress(page, 1);
  await expect(answer).toBeEnabled();
  await expect(check).toBeEnabled();

  // Now find the real length structurally rather than asserting a random value.
  for (let candidate = 1; candidate <= 10; candidate++) {
    await answer.fill(String(candidate));
    await check.click();
    if ((await page.getByRole('progressbar').getAttribute('aria-valuenow')) !== '1') break;
  }
  await expectProgress(page, 2);
});

test('3 — starts in Hebrew RTL, switches to English LTR, and opens a game', async ({ page }) => {
  await page.goto(routes.home);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');

  await page.getByRole('button', { name: he.language.label }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1, name: en.app.title })).toBeVisible();

  await page.goto(routes.findThePoint);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1, name: en.games.findThePoint.name })).toBeVisible();
  // Math notation stays LTR even though the rest of the page direction can flip.
  await expect(page.locator('.math-text').first()).toHaveAttribute('dir', 'ltr');
});

test('4 — completes a full drawing end to end and reaches the completion screen', async ({ page }) => {
  await page.goto(routes.drawByCoordinates);

  const pair = page.locator('.draw-by-coordinates-pair');
  const progress = page.locator('.draw-by-coordinates-progress');
  const completion = page.getByText(he.drawByCoordinates.completion.title);

  // Read how many points this (randomly chosen) drawing needs, then walk them all.
  const total = Number((await progress.innerText()).match(/\d+/g)![1]);
  expect(total).toBeGreaterThanOrEqual(8);

  for (let step = 0; step < total; step++) {
    const before = await progress.innerText();
    const target = await readPair(pair);
    await clickGrid(page, target.x, target.y);
    if (step < total - 1) await expect(progress).not.toHaveText(before);
  }

  await expect(completion).toBeVisible();
  await expect(page.getByRole('button', { name: he.drawByCoordinates.actions.anotherDrawing })).toBeVisible();
});

test('5 — clicking the plane directly: a wrong point is rejected, the right one is accepted', async ({ page }) => {
  await page.goto(routes.drawByCoordinates);

  const pair = page.locator('.draw-by-coordinates-pair');
  const target = await readPair(pair);
  // Pick a point that is definitely not the target but still inside the grid.
  const wrongX = target.x >= 0 ? target.x - 5 : target.x + 5;

  const progressBefore = await page.locator('.draw-by-coordinates-progress').innerText();

  await clickGrid(page, wrongX, target.y);
  await expect(page.locator('.draw-by-coordinates-feedback')).toBeVisible();
  await expect(page.locator('.draw-point')).toHaveCount(0);
  await expect(page.locator('.draw-by-coordinates-progress')).toHaveText(progressBefore);

  await clickGrid(page, target.x, target.y);
  await expect(page.locator('.draw-point')).toHaveCount(1);
});

test('6 — a nested route survives a direct load / refresh (SPA fallback)', async ({ page }) => {
  await page.goto(routes.detective);
  await expect(page.getByText(he.coordinateDetective.prompt)).toBeVisible();
  await page.reload();
  await expect(page.getByText(he.coordinateDetective.prompt)).toBeVisible();
});
