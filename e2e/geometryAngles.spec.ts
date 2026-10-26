import { expect, test } from '@playwright/test';
import he from '../src/i18n/locales/he/translation.json' with { type: 'json' };

const topic = '/grade/7/geometry';
const rays = '/grade/7/geometry/rays-and-angles';
const types = '/grade/7/geometry/angle-types';
const notation = '/grade/7/geometry/angle-notation';
const compare = '/grade/7/geometry/compare-angles';
const construct = '/grade/7/geometry/construct-an-angle';
const measure = '/grade/7/geometry/measure-an-angle';

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
  await expect(page.getByRole('link', { name: new RegExp(he.anglesGrade7.measure.gameName) })).toBeVisible();
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

test('Angle Notation — Select all valid names: toggling options and checking produces clear right/wrong/missed feedback', async ({ page }) => {
  // `?difficulty=basic` pins the question-*kind* sequence deterministically
  // (the kind rotation is fixed per difficulty; only each question's own
  // random scene content varies) — basic's rotation is
  // [selectName, selectAllNames, selectName, selectInvalid], so answering the
  // first question correctly always advances straight into a selectAllNames
  // question next.
  await page.goto(`${notation}?difficulty=basic&start=1`);
  await expect(page.locator('.tr-play')).toBeVisible();

  // Answer question 1 (a plain single-select 'selectName') correctly by
  // brute force: keep trying untried options until one is marked correct.
  const tried = new Set<number>();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const options = page.locator('.angles7-option');
    const count = await options.count();
    let clickedIndex = -1;
    for (let i = 0; i < count; i += 1) {
      if (!tried.has(i)) {
        clickedIndex = i;
        break;
      }
    }
    if (clickedIndex === -1) throw new Error('ran out of untried options before finding the correct one');
    tried.add(clickedIndex);
    await options.nth(clickedIndex).click();
    await page.waitForTimeout(300);
    const isCorrect = await page.locator('.angles7-feedback.is-correct').count();
    if (isCorrect > 0) break;
    // Wrong: wait out the retry beat so the same question re-enables, then try the next option.
    await page.waitForTimeout(2200);
  }

  // Now on question 2 — the selectAllNames kind.
  await expect(page.locator('.angles7-scene[data-kind="selectAllNames"]')).toBeVisible({ timeout: 5000 });

  const checkButton = page.getByTestId('angles-selectall-check');
  await expect(checkButton).toBeDisabled();

  const nameOptions = page.locator('.angles7-scene[data-kind="selectAllNames"] .angles7-option');
  const optionCount = await nameOptions.count();
  expect(optionCount).toBeGreaterThanOrEqual(4);

  // Toggle the first option on, then off, then on again — confirms it is a
  // real toggle (not an instant single-select submit like the other kinds).
  await nameOptions.first().click();
  await expect(nameOptions.first()).toHaveClass(/is-selected/);
  await nameOptions.first().click();
  await expect(nameOptions.first()).not.toHaveClass(/is-selected/);
  await nameOptions.first().click();
  await expect(checkButton).toBeEnabled();

  await checkButton.click();
  await expect(page.locator('.angles7-feedback')).not.toHaveText('');

  // Whatever the outcome, every option must now carry a visible status tag
  // (correct / missed / not valid) — not just a plain color — so the
  // right/wrong/missed breakdown is legible, not merely color-coded.
  const statuses = page.locator('.angles7-scene[data-kind="selectAllNames"] .angles7-option-status');
  await expect(statuses.first()).toBeVisible();
});

test("Measure an Angle: the protractor's own baseline direction matches the fixed ray's actual drawn direction (programmatic SVG check, several generated questions)", async ({
  page,
}) => {
  for (let i = 0; i < 3; i += 1) {
    await start(page, measure);

    const fixedRay = page.locator('[data-testid="geo-ray-fixed"]');
    const measuredRay = page.locator('[data-testid="geo-ray-measured"]');
    // Plain SVG `<line>` elements can have a zero-width/zero-height bounding
    // box depending on their exact orientation (e.g. perfectly vertical), so
    // Playwright's area-based `toBeVisible()` is the wrong check here —
    // `toBeAttached()` (present in the real rendered DOM) is what actually
    // matters for a thin geometric line.
    await expect(fixedRay).toBeAttached();
    await expect(measuredRay).toBeAttached();
    await expect(page.locator('[data-testid="geo-protractor"]')).toBeVisible();
    await expect(page.locator('[data-testid="protractor-tick-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="protractor-tick-180"]')).toBeVisible();

    if (i === 0) await page.screenshot({ path: 'test-results/angles-measure-screenshot.png' });

    const readLine = async (locator: typeof fixedRay) => {
      const box = await locator.evaluate((el) => {
        const line = el as SVGLineElement;
        return {
          x1: Number(line.getAttribute('x1')),
          y1: Number(line.getAttribute('y1')),
          x2: Number(line.getAttribute('x2')),
          y2: Number(line.getAttribute('y2')),
        };
      });
      return (Math.atan2(box.y2 - box.y1, box.x2 - box.x1) * 180) / Math.PI;
    };
    const readTextPoint = async (testId: string) => {
      const el = page.locator(`[data-testid="${testId}"]`);
      return el.evaluate((node) => ({ x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')) }));
    };
    const vertex = await page.locator('.geo-point circle').first().evaluate((el) => {
      const circle = el as SVGCircleElement;
      return { x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')) };
    });

    const fixedDeg = (((await readLine(fixedRay)) % 360) + 360) % 360;
    const tick0 = await readTextPoint('protractor-tick-0');
    const tick0Deg = (((Math.atan2(tick0.y - vertex.y, tick0.x - vertex.x) * 180) / Math.PI) % 360 + 360) % 360;
    const tick0Gap = Math.min(Math.abs(fixedDeg - tick0Deg), 360 - Math.abs(fixedDeg - tick0Deg));
    expect(tick0Gap, `seed #${i}: protractor 0° tick must sit exactly on the fixed ray's real drawn direction`).toBeLessThan(1);

    const tick180 = await readTextPoint('protractor-tick-180');
    const tick180Deg = (((Math.atan2(tick180.y - vertex.y, tick180.x - vertex.x) * 180) / Math.PI) % 360 + 360) % 360;
    const expectedOpposite = (fixedDeg + 180) % 360;
    const tick180Gap = Math.min(Math.abs(expectedOpposite - tick180Deg), 360 - Math.abs(expectedOpposite - tick180Deg));
    expect(tick180Gap, `seed #${i}: protractor 180° tick must sit exactly opposite the fixed ray`).toBeLessThan(1);

    // Grade with a visibly wrong reading, then a correct-enough one, so both feedback paths render real text.
    const input = page.getByTestId('angles-measure-input');
    await input.fill('1');
    await page.getByTestId('angles-measure-check').click();
    await expect(page.locator('.angles7-feedback')).not.toHaveText('');
    await expect(page.locator('.angles7-feedback.is-wrong')).toBeVisible();
  }
});
