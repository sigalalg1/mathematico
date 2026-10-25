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

/**
 * Tries each `.tr-option` in turn. A wrong pick locks the options briefly
 * (the engine's `feedback` phase), then unlocks them again for a plain
 * `retry` — no option is marked, so this just moves on to the next one,
 * the same honest "keep trying" walk `solveCurrentQuestion` does for the
 * number line.
 */
async function solveTrOptionQuestion(page: Page, question: number, total: number): Promise<void> {
  const options = page.locator('.tr-option');
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    await options.nth(i).click();
    try {
      if (question < total) {
        await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(question + 1), {
          timeout: 2000,
        });
      } else {
        await expect(page.getByTestId('tr-results')).toBeVisible({ timeout: 2000 });
      }
      return;
    } catch {
      // Wrong guess — the engine moved to a retry phase; try the next option.
    }
  }
  throw new Error('no option was ever accepted across a full retry cycle');
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

test('Absolute Value offers focused training configuration', async ({ page }) => {
  await page.goto(routes.distanceFromZero);
  await expect(page.getByRole('heading', { level: 1, name: he.absoluteValue.gameName })).toBeVisible();
  await expect(page.getByTestId('tr-count-5')).toBeVisible();
  await expect(page.getByTestId('tr-count-10')).toBeVisible();
  await expect(page.getByTestId('tr-count-20')).toBeVisible();
  await page.getByTestId('tr-start').click();
  await expect(page.getByText(he.absoluteValue.distancePrinciple)).toBeVisible();
  await expect(page.locator('.absolute-expression')).toHaveAttribute('dir', 'ltr');
});

test('Steps on the Line plays through to completion', async ({ page }) => {
  await playToCompletion(page, routes.stepsOnTheLine, he.signedAddSub.completion.title);
});

test('The Sign Rule plays through discovery and a full training round', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(routes.theSignRule);

  // Three discovery screens precede practice; the last button reads differently.
  await page.getByRole('button', { name: he.signRules.discovery.continue }).click();
  await page.getByRole('button', { name: he.signRules.discovery.continue }).click();
  await page.getByRole('button', { name: he.signRules.discovery.startPractice }).click();

  await page.getByTestId('tr-count-5').click();
  await page.getByTestId('tr-start').click();

  const total = Number(await page.getByRole('progressbar').getAttribute('aria-valuemax'));
  expect(total).toBeGreaterThan(1);

  for (let question = 1; question <= total; question++) {
    await expectProgress(page, question);
    await solveTrOptionQuestion(page, question, total);
  }

  await expect(page.getByTestId('tr-results')).toBeVisible({ timeout: 10_000 });
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

  for (const [route, title, ltrSelector] of [
    [routes.findTheSpot, en.numberLinePlace.gameName, '.number-line'],
    [routes.whichIsGreater, en.compareSigned.gameName, '.number-line'],
    [routes.distanceFromZero, en.absoluteValue.gameName, '.number-line'],
    [routes.stepsOnTheLine, en.signedAddSub.gameName, '.number-line'],
    // The Sign Rule has no number line — its expressions are plain math
    // notation, shown on its discovery screen before practice even starts.
    [routes.theSignRule, en.signRules.gameName, '.math-text'],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    // Absolute Value now uses the shared Training setup; its number line is
    // intentionally part of the first Basic question, not the setup screen.
    if (route === routes.distanceFromZero) await page.getByTestId('tr-start').click();
    // Math notation stays left-to-right wherever it appears.
    await expect(page.locator(ltrSelector).first()).toHaveAttribute('dir', 'ltr');
  }
});
