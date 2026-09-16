import { expect, test } from '@playwright/test';
import he from '../src/i18n/locales/he/translation.json' with { type: 'json' };

const route = '/grade/4/multiplication/basketball-monkey';

async function start(page: import('@playwright/test').Page) {
  await page.goto(route);
  await page.getByRole('button', { name: he.training.setup.startPractice }).click();
  await expect(page.locator('.tr-play')).toBeVisible();
}

test('Basketball Monkey shoots into the selected correct hoop', async ({ page }) => {
  await start(page);
  const equation = await page.locator('.tr-fact').innerText();
  const match = /(\d+)\s*×\s*(\d+)/.exec(equation);
  if (!match) throw new Error(`Could not parse equation "${equation}"`);
  const answer = Number(match[1]) * Number(match[2]);
  const hoop = page.getByTestId(`tr-option-${answer}`);

  await hoop.click();

  await expect(hoop).toHaveClass(/tr-option-correct/);
  await expect(page.locator('.basketball-shell')).toHaveAttribute('data-shot-target', String(answer));
  await expect(page.locator('.basketball-shell')).toHaveAttribute('data-shot-result', 'correct');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
});

test('mobile court stays within the viewport with four large hoops', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.tr-option')).toHaveCount(4);
  for (const hoop of await page.locator('.tr-option').all()) {
    const box = await hoop.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThanOrEqual(82);
  }
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(390);
});
