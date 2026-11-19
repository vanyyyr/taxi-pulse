import { test, expect } from '@playwright/test';

test.describe('Auth Flow (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('displays AuthModal when driver is not authenticated', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('ТаксиДрайв');
    await expect(page.getByText('Личный кабинет водителя')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Продолжить' })).toBeVisible();
  });

  test('keeps Continue button disabled when phone has less than 10 digits', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    const continueBtn = page.getByRole('button', { name: 'Продолжить' });

    // Enter short phone
    await phoneInput.fill('12345');
    await expect(continueBtn).toBeDisabled();

    // Fill valid 10 digits
    await phoneInput.fill('9991234567');
    await expect(continueBtn).toBeEnabled();
  });

  test('completes login flow with phone and 4-digit PIN', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('9991234567');
    await page.getByRole('button', { name: 'Продолжить' }).click();

    // Step 2: PIN view
    await expect(page.getByText('4-значный PIN')).toBeVisible();

    // Enter PIN: 1, 2, 3, 4
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await page.getByRole('button', { name: '4', exact: true }).click();

    // Main app renders: Header with brand and driver badge
    await expect(page.getByText('Личный кабинет водителя')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();
    await expect(page.getByText('История', { exact: true })).toBeVisible();

    // Verify localStorage persistence
    const savedDriver = await page.evaluate(() => localStorage.getItem('taxipulse_current_driver'));
    expect(savedDriver).toBeTruthy();
    expect(savedDriver).toContain('79991234567');
  });

  test('allows navigating back from PIN step via "Изменить"', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('9991234567');
    await page.getByRole('button', { name: 'Продолжить' }).click();

    await expect(page.getByText('4-значный PIN')).toBeVisible();
    await page.getByRole('button', { name: '1', exact: true }).click();

    // Click "Изменить"
    await page.getByRole('button', { name: 'Изменить' }).click();

    // Phone input is back
    await expect(page.locator('input[type="tel"]')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toHaveValue('+7 (999) 123-45-67');
  });

  test('persists authenticated driver session across page reload', async ({ page }) => {
    // 1. Log in
    await page.locator('input[type="tel"]').fill('9161112233');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();

    // 2. Reload page
    await page.reload();

    // Driver remains logged in, AuthModal is not displayed
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();
    await expect(page.locator('input[type="tel"]')).not.toBeVisible();
  });

  test('rejects login with incorrect PIN for an existing driver', async ({ page }) => {
    // 1. Register driver with PIN 1234
    await page.locator('input[type="tel"]').fill('9165556677');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();

    // 2. Clear current session to force login screen
    await page.evaluate(() => localStorage.removeItem('taxipulse_current_driver'));
    await page.reload();

    // 3. Attempt login with wrong PIN 9999
    await page.locator('input[type="tel"]').fill('9165556677');
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['9', '9', '9', '9']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }

    // Expect error message
    await expect(page.getByText('Неверный 4-значный PIN-код')).toBeVisible();
  });
});
