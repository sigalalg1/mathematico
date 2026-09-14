import { expect, test } from '@playwright/test';
import { clickGrid, readPair, routes } from './helpers';
import he from '../src/i18n/locales/he/translation.json' with { type: 'json' };

const account = '/account';
const activity = '/activity';

test('7 — a guest reaches the account page without any crash or console error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(account);
  await expect(page.getByRole('heading', { level: 1, name: he.auth.title })).toBeVisible();
  await expect(page.getByText(he.auth.guestNote)).toBeVisible();

  // Without Supabase env vars the build degrades to guest-only mode: the form is
  // visible but disabled, and the page explains why.
  const hasAccounts = !(await page.getByText(he.auth.unavailable).first().isVisible());
  const submit = page.locator('.account-form button[type="submit"]');
  await expect(submit).toBeVisible();
  if (hasAccounts) {
    await expect(submit).toBeEnabled();
    // No client-side password rules: a simple password must be accepted by the form.
    await expect(page.locator('.account-form input[type="password"]')).not.toHaveAttribute('minlength', /.*/);
  } else {
    await expect(submit).toBeDisabled();
  }

  // Gameplay is still reachable from here.
  await page.goto(routes.hitTheTarget);
  await expect(page.getByText(he.hitTheTarget.prompt)).toBeVisible();
  expect(errors).toEqual([]);
});

test('8 — guest progress is saved locally and survives a real page refresh', async ({ page }) => {
  await page.goto(routes.drawByCoordinates);

  const pair = page.locator('.draw-by-coordinates-pair');
  const progress = page.locator('.draw-by-coordinates-progress');
  const total = Number((await progress.innerText()).match(/\d+/g)![1]);

  for (let step = 0; step < total; step++) {
    const before = await progress.innerText();
    const target = await readPair(pair);
    await clickGrid(page, target.x, target.y);
    if (step < total - 1) await expect(progress).not.toHaveText(before);
  }
  await expect(page.getByText(he.drawByCoordinates.completion.title)).toBeVisible();

  await page.goto(activity);
  await expect(page.getByText(he.games.drawByCoordinates.name).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText(he.games.drawByCoordinates.name).first()).toBeVisible();
  await expect(page.getByText(he.activity.empty)).toBeHidden();
});
