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

    // Tema escuro padrão do redesign (#48): --signal #ffb547 e --on-signal/--paper #0a1a2f.
    // No hover o CTA fica com fundo transparente, então o contraste é medido contra o
    // primeiro fundo opaco entre os ancestrais.
    const readStyle = (el) => {
      const cs = getComputedStyle(el);
      let backgroundColor = cs.backgroundColor;
      for (let node = el; node && /rgba\(.*,\s*0\)$|transparent/.test(backgroundColor); node = node.parentElement) {
        backgroundColor = getComputedStyle(node.parentElement ?? document.documentElement).backgroundColor;
        if (!node.parentElement) break;
      }
      return { color: cs.color, backgroundColor };
    };

    const defaultStyle = await cta.evaluate(readStyle);
    expect(defaultStyle.color).toBe('rgb(10, 26, 47)');
    expect(defaultStyle.backgroundColor).toBe('rgb(255, 181, 71)');
    expect(contrastRatio(defaultStyle.color, defaultStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);

    await cta.hover();
    const hoverStyle = await cta.evaluate(readStyle);
    expect(hoverStyle.color).toBe('rgb(255, 181, 71)');
    expect(hoverStyle.backgroundColor).toBe('rgb(10, 26, 47)');
    expect(contrastRatio(hoverStyle.color, hoverStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);

    // Tira o mouse de cima do CTA: no redesign o hover inverte as cores, e o
    // estado de foco precisa ser medido sem hover simultâneo.
    await page.mouse.move(0, 0);

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
    expect(focusState.color).toBe('rgb(10, 26, 47)');
    expect(focusState.backgroundColor).toBe('rgb(255, 181, 71)');
    expect(focusState.outlineStyle).not.toBe('none');
    expect(parseFloat(focusState.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(focusState.outlineColor).toBe('rgb(255, 181, 71)');
    expect(parseFloat(focusState.outlineOffset)).toBeGreaterThanOrEqual(2);
    expect(contrastRatio(focusState.color, focusState.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('regression: dark form placeholder contrast', () => {
  test('#evidence-json placeholder stays readable against the dark paper background', async ({ page }) => {
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

    // Tema escuro padrão do redesign (#48): --ink-muted #b8cde4 sobre --paper #0a1a2f.
    expect(state.placeholderColor).toBe('rgb(184, 205, 228)');
    expect(state.placeholderOpacity).toBe('1');
    expect(state.backgroundColor).toBe('rgb(10, 26, 47)');
    expect(contrastRatio(state.placeholderColor, state.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });
});
