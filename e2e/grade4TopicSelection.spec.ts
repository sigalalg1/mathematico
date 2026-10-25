import { expect, test } from '@playwright/test';

const grade4Path = '/grade/4';
const realTopicPaths = [
  '/grade/4/fractions-part-1',
  '/grade/4/multiplication',
  '/grade/4/penalty-shootout',
];

test.describe('Grade 4 topic selection', () => {
  for (const width of [390, 430, 1280]) {
    test(`fits the Hebrew topic screen at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(grade4Path);

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('.g4-topic-card')).toHaveCount(realTopicPaths.length);
      for (const path of realTopicPaths) {
        await expect(page.locator(`.g4-topic-card[href="${path}"]`)).toBeVisible();
      }

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    });
  }

  test('switches to LTR and opens a real topic by keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(grade4Path);
    await page.getByRole('button', { name: 'שפה' }).click();

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    const fractions = page.getByRole('link', { name: /Fractions – Part 1/ });
    await fractions.focus();
    await expect(fractions).toBeFocused();
    await fractions.press('Enter');
    await expect(page).toHaveURL(/\/grade\/4\/fractions-part-1$/);
  });
});
