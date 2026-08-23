import { test, expect } from '@playwright/test';

const DISABLE_ANIMATIONS_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }
`;

// The CTA's :focus-visible outline is drawn outside the element's own
// border box (outline-offset: 3px), so a plain locator screenshot — which
// clips to the element's bounding box — never captures it. This padding
// widens the clip region enough to include the outline plus a small
// contextual margin.
const FOCUS_OUTLINE_CLIP_PADDING = 8;

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
});

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
}

test('home renders consistently', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForFonts(page);
  await expect(page).toHaveScreenshot('home.png', { fullPage: true });
});

test('analyze renders consistently', async ({ page }) => {
  await page.goto('/analyze.html');
  await page.waitForLoadState('networkidle');
  await waitForFonts(page);
  await expect(page).toHaveScreenshot('analyze.png', { fullPage: true });
});

test('home CTA hover state renders consistently', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'CTA hover/focus baselines are desktop-only.');
  await page.goto('/index.html');
  await waitForFonts(page);
  const cta = page.locator('.nav-cta');
  await cta.hover();
  await expect(cta).toHaveScreenshot('home-cta-hover.png');
});

test('home CTA focus-visible state renders consistently', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'CTA hover/focus baselines are desktop-only.');
  await page.goto('/index.html');
  await waitForFonts(page);
  await page.locator('body').evaluate((el) => el.focus());
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press('Tab');
    // eslint-disable-next-line no-await-in-loop
    const isCta = await page.evaluate(() => document.activeElement?.classList.contains('nav-cta'));
    if (isCta) break;
  }
  const cta = page.locator('.nav-cta');
  const box = await cta.boundingBox();
  if (!box) throw new Error('CTA bounding box unavailable — cannot clip the focus-visible screenshot.');
  const clip = {
    x: Math.max(0, box.x - FOCUS_OUTLINE_CLIP_PADDING),
    y: Math.max(0, box.y - FOCUS_OUTLINE_CLIP_PADDING),
    width: box.width + FOCUS_OUTLINE_CLIP_PADDING * 2,
    height: box.height + FOCUS_OUTLINE_CLIP_PADDING * 2
  };
  await expect(page).toHaveScreenshot('home-cta-focus-visible.png', { clip });
});
