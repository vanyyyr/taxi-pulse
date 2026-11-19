import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: '320px (iPhone SE 1st Gen)', width: 320, height: 640 },
  { name: '375px (iPhone SE 2nd Gen)', width: 375, height: 667 },
  { name: '390px (iPhone 12/13/14)', width: 390, height: 844 },
  { name: '414px (iPhone XR/11)', width: 414, height: 896 },
  { name: '430px (iPhone 14/15/16 Pro Max)', width: 430, height: 932 },
];

test.describe('Mobile Viewport & Overflow Verification (Tier 1 & Tier 2)', () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test(`has no horizontal overflow at viewport ${vp.name} on Auth screen`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await expect(page.locator('h1')).toHaveText('ТаксиДрайв');

      // Verify page does not have horizontal scrollbar
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test(`has no horizontal overflow at viewport ${vp.name} in Main Application`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      // Authenticate driver
      await page.locator('input[type="tel"]').fill('9991234567');
      await page.getByRole('button', { name: 'Продолжить' }).click();
      for (const d of ['1', '2', '3', '4']) {
        await page.getByRole('button', { name: d, exact: true }).click();
      }
      await expect(page.getByText('Смена', { exact: true })).toBeVisible();

      // Check overflow on Shift tab
      const shiftOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(shiftOverflow).toBe(false);

      // Check overflow on Analytics tab
      await page.getByRole('button', { name: 'Аналитика' }).click();
      await page.waitForTimeout(250);
      const analyticsOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(analyticsOverflow).toBe(false);

      // Check overflow on History tab
      await page.getByRole('button', { name: 'История' }).click();
      await page.waitForTimeout(250);
      const historyOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(historyOverflow).toBe(false);

      // Check overflow on Profile tab
      await page.getByRole('button', { name: 'Профиль' }).click();
      await page.waitForTimeout(250);
      const profileOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(profileOverflow).toBe(false);
    });
  }

  test('keeps Bottom Navigation Bar fixed and visible across viewports', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Authenticate
    await page.locator('input[type="tel"]').fill('9991234567');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();

    const bottomNav = page.locator('nav');
    await expect(bottomNav).toBeVisible();

    // Verify nav bounding box is attached near the bottom of viewport
    const box = await bottomNav.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.y + box.height).toBeGreaterThanOrEqual(650);
      expect(box.width).toBeLessThanOrEqual(375);
    }
  });
});
