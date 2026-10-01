import { test, expect } from '@playwright/test';

// The nav CTA lives inside `.nav`, collapsed (display: none) below the
// 980px breakpoint until the hamburger menu is opened — so on the mobile
// project it is attached but not visible, which is the site's intended
// behavior, not a defect.

test.describe('smoke: home', () => {
  test('renders main content and the primary CTA', async ({ page }, testInfo) => {
    await page.goto('/index.html');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.nav-cta')).toBeAttached();
    await expect(page.locator('.nav-cta')).toHaveText('Aplicar AIMA');
    if (testInfo.project.name === 'desktop') {
      await expect(page.locator('.nav-cta')).toBeVisible();
    }
  });
});

test.describe('smoke: analyze', () => {
  test('renders the form and its evidence controls', async ({ page }, testInfo) => {
    await page.goto('/analyze.html');
    await expect(page.locator('#analyze-form')).toBeVisible();
    await expect(page.locator('#evidence-json')).toBeAttached();
    await expect(page.locator('.nav-cta')).toBeAttached();
    if (testInfo.project.name === 'desktop') {
      await expect(page.locator('.nav-cta')).toBeVisible();
    }
  });
});
