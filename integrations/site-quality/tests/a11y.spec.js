import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contrastRatio } from './contrast.js';

const SERIOUS_IMPACTS = new Set(['serious', 'critical']);

function seriousViolations(results) {
  return results.violations.filter((violation) => SERIOUS_IMPACTS.has(violation.impact));
}

function formatViolations(violations) {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    .join('\n');
}

test.describe('axe: serious/critical violations', () => {
  test('home has no serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/index.html');
    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousViolations(results);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });

  test('analyze has no serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/analyze.html');
    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousViolations(results);
    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

test.describe('regression: nav CTA text visibility', () => {
  test('default, hover and focus-visible all keep text readable against the background', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'The nav CTA is collapsed inside the mobile menu below 980px.');
    await page.goto('/index.html');
    const cta = page.locator('.nav-cta');

    const defaultStyle = await cta.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, backgroundColor: cs.backgroundColor };
    });
    expect(defaultStyle.color).toBe('rgb(17, 17, 17)');
    expect(defaultStyle.backgroundColor).toBe('rgb(212, 160, 23)');
    expect(contrastRatio(defaultStyle.color, defaultStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);

    await cta.hover();
    const hoverStyle = await cta.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, backgroundColor: cs.backgroundColor };
    });
    expect(hoverStyle.color).toBe('rgb(17, 17, 17)');
    expect(hoverStyle.backgroundColor).toBe('rgb(229, 198, 106)');
    expect(contrastRatio(hoverStyle.color, hoverStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);

    // Move focus deterministically onto the CTA via real keyboard Tab navigation,
    // rather than a hardcoded tab-index, so the test survives nav changes.
    await page.locator('body').evaluate((el) => el.focus());
    let reachedCta = false;
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press('Tab');
      // eslint-disable-next-line no-await-in-loop
      const isCta = await page.evaluate(() => document.activeElement?.classList.contains('nav-cta'));
      if (isCta) {
        reachedCta = true;
        break;
      }
    }
    expect(reachedCta).toBe(true);

    const focusState = await cta.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        matchesFocus: el.matches(':focus'),
        matchesFocusVisible: el.matches(':focus-visible'),
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor,
        outlineOffset: cs.outlineOffset
      };
    });
    expect(focusState.matchesFocus).toBe(true);
    expect(focusState.matchesFocusVisible).toBe(true);
    expect(focusState.color).toBe('rgb(17, 17, 17)');
    expect(focusState.backgroundColor).toBe('rgb(229, 198, 106)');
    expect(focusState.outlineStyle).not.toBe('none');
    expect(parseFloat(focusState.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(focusState.outlineColor).toBe('rgb(212, 160, 23)');
    expect(parseFloat(focusState.outlineOffset)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(focusState.color, focusState.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('regression: dark form placeholder contrast', () => {
  test('#evidence-json placeholder stays readable against the graphite background', async ({ page }) => {
    await page.goto('/analyze.html');
    const textarea = page.locator('#evidence-json');

    const state = await textarea.evaluate((el) => {
      const placeholderStyle = getComputedStyle(el, '::placeholder');
      const elementStyle = getComputedStyle(el);
      return {
        placeholderColor: placeholderStyle.color,
        placeholderOpacity: placeholderStyle.opacity,
        backgroundColor: elementStyle.backgroundColor
      };
    });

    expect(state.placeholderColor).toBe('rgb(150, 150, 150)');
    expect(state.placeholderOpacity).toBe('1');
    expect(state.backgroundColor).toBe('rgb(26, 26, 26)');
    expect(contrastRatio(state.placeholderColor, state.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });
});
