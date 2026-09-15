import { expect, test, type Page } from '@playwright/test';
import { expectProgress } from './helpers';
import he from '../src/i18n/locales/he/translation.json' with { type: 'json' };
import en from '../src/i18n/locales/en/translation.json' with { type: 'json' };

const routes = {
  home: '/',
  grade7: '/grade/7',
  topic: '/grade/7/signed-numbers',
  findTheSpot: '/grade/7/signed-numbers/find-the-spot',
  whichIsGreater: '/grade/7/signed-numbers/which-is-greater',
  distanceFromZero: '/grade/7/signed-numbers/distance-from-zero',
  stepsOnTheLine: '/grade/7/signed-numbers/steps-on-the-line',
  theSignRule: '/grade/7/signed-numbers/the-sign-rule',
};

/**
 * Plays one question by trying the clickable points until one is accepted.
 * Nothing here assumes a particular generated question, so the walk stays
 * honest about what a student can actually do on the screen.
 */
async function solveCurrentQuestion(page: Page): Promise<void> {
  const labels = await page
    .locator('.number-line-point')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));

  let checkedRetryInPlace = false;
  for (const label of labels) {
    await page.locator(`.number-line-point[aria-label="${label}"]`).click({ force: true });
    if ((await page.locator('.number-line-point.is-correct').count()) > 0) return;

    if (!checkedRetryInPlace) {
      // The first wrong answer must explain itself and leave the line usable.
      await expect(page.locator('.feedback-hint-text')).toBeVisible();
      await expect(page.locator('.number-line-point.is-disabled')).toHaveCount(0);
      await expect(page.locator('.number-line-point.is-correct')).toHaveCount(0);
      checkedRetryInPlace = true;
    }
  }
  throw new Error('no clickable point was ever accepted');
}

async function playToCompletion(page: Page, route: string, completionTitle: string): Promise<void> {
  test.setTimeout(120_000);
  await page.goto(route);
  const total = Number(await page.getByRole('progressbar').getAttribute('aria-valuemax'));
  expect(total).toBeGreaterThan(1);

  for (let question = 1; question <= total; question++) {
    await expectProgress(page, question);
    await solveCurrentQuestion(page);
    if (question < total) {
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(question + 1));
    }
  }

  await expect(page.getByText(completionTitle)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: he.signedNumbers.actions.playAgain })).toBeVisible();
}

test('navigates home → Grade 7 → Signed Numbers → an activity', async ({ page }) => {
  await page.goto(routes.home);
  await page.getByRole('link').filter({ hasText: he.grades['7'] }).click();

  await page.getByRole('link').filter({ hasText: he.topics.signedNumbers.name }).click();
  await expect(page).toHaveURL(/\/signed-numbers$/);
  await expect(page.getByRole('heading', { level: 1, name: he.signedNumbersPage.title })).toBeVisible();

  await page.getByRole('link').filter({ hasText: he.numberLinePlace.gameName }).click();
  await expect(page).toHaveURL(/\/find-the-spot$/);
  await expectProgress(page, 1);
});

test('lists all five activities on the topic page and links each one', async ({ page }) => {
  await page.goto(routes.topic);
  for (const name of [
    he.numberLinePlace.gameName,
    he.compareSigned.gameName,
    he.absoluteValue.gameName,
    he.signedAddSub.gameName,
    he.signRules.gameName,
  ]) {
    await expect(page.getByRole('link').filter({ hasText: name })).toBeVisible();
  }
});

test('Find the Spot plays through to completion', async ({ page }) => {
  await playToCompletion(page, routes.findTheSpot, he.numberLinePlace.completion.title);
});

test('Which Is Greater plays through to completion', async ({ page }) => {
  await playToCompletion(page, routes.whichIsGreater, he.compareSigned.completion.title);
});

test('Distance from Zero plays through to completion', async ({ page }) => {
  await playToCompletion(page, routes.distanceFromZero, he.absoluteValue.completion.title);
});

test('Steps on the Line plays through to completion', async ({ page }) => {
  await playToCompletion(page, routes.stepsOnTheLine, he.signedAddSub.completion.title);
});

test('The Sign Rule plays through to completion', async ({ page }) => {
  await playToCompletion(page, routes.theSignRule, he.signRules.completion.title);
});

test('a wrong answer explains itself without locking the line or advancing', async ({ page }) => {
  await page.goto(routes.findTheSpot);
  await expectProgress(page, 1);

  const points = page.locator('.number-line-point');
  // Click every point until one lands wrong, then check the page teaches rather
  // than just blocking.
  const count = await points.count();
  for (let index = 0; index < count; index++) {
    await points.nth(index).click({ force: true });
    if ((await page.getByRole('progressbar').getAttribute('aria-valuenow')) === '1') {
      await expect(page.locator('.feedback-hint-text')).toBeVisible();
      await expect(page.locator('.number-line-point.is-incorrect')).toHaveCount(1);
      await expect(page.locator('.number-line-point.is-correct')).toHaveCount(0);
      await expect(page.locator('.number-line-point.is-disabled')).toHaveCount(0);
      return;
    }
    // That one was right; the next question gives another chance to be wrong.
  }
  throw new Error('never produced a wrong answer to inspect');
});

test('the whole unit renders in Hebrew RTL and in English LTR', async ({ page }) => {
  await page.goto(routes.topic);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1, name: he.signedNumbersPage.title })).toBeVisible();

  await page.getByRole('button', { name: he.language.label }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1, name: en.signedNumbersPage.title })).toBeVisible();

  for (const [route, title] of [
    [routes.findTheSpot, en.numberLinePlace.gameName],
    [routes.whichIsGreater, en.compareSigned.gameName],
    [routes.distanceFromZero, en.absoluteValue.gameName],
    [routes.stepsOnTheLine, en.signedAddSub.gameName],
    [routes.theSignRule, en.signRules.gameName],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    // Math notation stays left-to-right wherever it appears.
    await expect(page.locator('.number-line')).toHaveAttribute('dir', 'ltr');
  }
});
