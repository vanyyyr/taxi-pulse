import { test, expect } from '@playwright/test';

test.describe('Touch Target Accessibility (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    // Standard mobile test viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('verifies Auth screen inputs and keypad buttons meet 44x44px minimum touch targets', async ({ page }) => {
    // Phone input
    const phoneInput = page.locator('input[type="tel"]');
    const inputBx = await phoneInput.boundingBox();
    expect(inputBx).toBeTruthy();
    if (inputBx) {
      expect(inputBx.height).toBeGreaterThanOrEqual(44);
    }

    // Continue button
    const continueBtn = page.getByRole('button', { name: 'Продолжить' });
    const continueBx = await continueBtn.boundingBox();
    expect(continueBx).toBeTruthy();
    if (continueBx) {
      expect(continueBx.height).toBeGreaterThanOrEqual(44);
    }

    // Advance to PIN keypad
    await phoneInput.fill('9991234567');
    await continueBtn.click();
    await expect(page.getByText('4-значный PIN')).toBeVisible();

    // Verify all 10 digit buttons in keypad
    for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      const btn = page.getByRole('button', { name: d, exact: true });
      const box = await btn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }

    // Verify backspace button
    const backspaceBtn = page.locator('button:has(svg.lucide-delete)');
    const bsBox = await backspaceBtn.boundingBox();
    expect(bsBox).toBeTruthy();
    if (bsBox) {
      expect(bsBox.height).toBeGreaterThanOrEqual(44);
      expect(bsBox.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('verifies Bottom Navigation tabs meet minimum 44x44px touch targets', async ({ page }) => {
    // Authenticate
    await page.locator('input[type="tel"]').fill('9991234567');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();

    const tabs = ['Смена', 'Аналитика', 'История', 'Профиль'];
    for (const tabName of tabs) {
      const tabBtn = page.getByRole('button', { name: tabName });
      const box = await tabBtn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('verifies primary Shift action buttons meet 44px minimum height', async ({ page }) => {
    // Authenticate
    await page.locator('input[type="tel"]').fill('9991234567');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();

    // "Начать смену" button
    const startBtn = page.getByRole('button', { name: 'Начать смену' });
    const startBox = await startBtn.boundingBox();
    expect(startBox).toBeTruthy();
    if (startBox) {
      expect(startBox.height).toBeGreaterThanOrEqual(44);
    }

    // "Записать смену вручную" button
    const manualBtn = page.getByRole('button', { name: 'Записать смену вручную' });
    const manualBox = await manualBtn.boundingBox();
    expect(manualBox).toBeTruthy();
    if (manualBox) {
      expect(manualBox.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('verifies active shift quick action buttons meet 44x44px touch requirements', async ({ page }) => {
    // Authenticate and start shift
    await page.locator('input[type="tel"]').fill('9991234567');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Начать смену' }).click();
    await page.getByRole('button', { name: 'Поехали' }).click();
    await expect(page.getByText('На линии')).toBeVisible();

    // Verify Quick Action buttons: Касса, Бензин, Расход
    for (const name of ['Касса', 'Бензин', 'Расход']) {
      const btn = page.getByRole('button', { name });
      const box = await btn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Verify "Завершить смену" button
    const completeBtn = page.getByRole('button', { name: 'Завершить смену' });
    const completeBox = await completeBtn.boundingBox();
    expect(completeBox).toBeTruthy();
    if (completeBox) {
      expect(completeBox.height).toBeGreaterThanOrEqual(44);
    }

    // Verify Reset Shift button
    const resetBtn = page.locator('button[title="Сбросить смену"]');
    const resetBox = await resetBtn.boundingBox();
    expect(resetBox).toBeTruthy();
    if (resetBox) {
      expect(resetBox.height).toBeGreaterThanOrEqual(44);
      expect(resetBox.width).toBeGreaterThanOrEqual(44);
    }
  });
});
