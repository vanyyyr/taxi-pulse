import { test, expect, Page } from '@playwright/test';

function generateUniquePhone(): string {
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `9${randomPart}`;
}

async function authenticateTestDriver(page: Page) {
  const phone = generateUniquePhone();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('input[type="tel"]').fill(phone);
  await page.getByRole('button', { name: 'Продолжить' }).click();

  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }

  await expect(page.getByText('Смена', { exact: true })).toBeVisible({ timeout: 10000 });
}

test.describe('Shift Lifecycle (Tier 1 & Tier 3)', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestDriver(page);
  });

  test('starts an active shift with odometer input', async ({ page }) => {
    // 1. Initial idle state
    await expect(page.getByRole('button', { name: 'Начать смену' })).toBeVisible();

    // 2. Click start shift
    await page.getByRole('button', { name: 'Начать смену' }).click();
    await expect(page.getByText('Одометр перед стартом (км):')).toBeVisible();

    // 3. Enter odometer and confirm
    const odoInput = page.locator('input[placeholder="145200"]');
    await odoInput.fill('154200');
    await page.getByRole('button', { name: 'Поехали' }).click();

    // 4. Verify Active Shift is running
    await expect(page.getByText('На линии')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Завершить смену' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Касса' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Бензин' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Расход' })).toBeVisible();
  });

  test('records quick revenue during active shift', async ({ page }) => {
    // Start shift
    await page.getByRole('button', { name: 'Начать смену' }).click();
    await page.getByRole('button', { name: 'Поехали' }).click();
    await expect(page.getByText('На линии')).toBeVisible();

    // Add revenue +3500 ₽
    await page.getByRole('button', { name: 'Касса' }).click();
    await expect(page.getByText('Добавить выручку')).toBeVisible();
    await page.locator('input[type="number"]').fill('3500');
    await page.getByRole('button', { name: 'Записать' }).click();

    // Modal closed and active shift updated
    await expect(page.getByText('Добавить выручку')).not.toBeVisible();
    await expect(page.locator('text=/3\\s?500/')).toBeVisible();
  });

  test('records quick fuel addition during active shift', async ({ page }) => {
    // Start shift
    await page.getByRole('button', { name: 'Начать смену' }).click();
    await page.getByRole('button', { name: 'Поехали' }).click();
    await expect(page.getByText('На линии')).toBeVisible();

    // Add fuel: 25L, 1450 ₽
    await page.getByRole('button', { name: 'Бензин' }).click();
    await expect(page.getByText('Заправка топливом')).toBeVisible();
    await page.locator('input[placeholder="25.0"]').fill('25');
    await page.locator('input[placeholder="0"]').fill('1450');
    await page.getByRole('button', { name: 'Записать' }).click();

    // Verify fuel updated in active widget
    await expect(page.getByText('Заправка топливом')).not.toBeVisible();
    await expect(page.locator('text=/25 л/')).toBeVisible();
    await expect(page.locator('text=/-1\\s?450/')).toBeVisible();
  });

  test('records quick other expense during active shift', async ({ page }) => {
    // Start shift
    await page.getByRole('button', { name: 'Начать смену' }).click();
    await page.getByRole('button', { name: 'Поехали' }).click();

    // Add lunch expense 450 ₽
    await page.getByRole('button', { name: 'Расход' }).click();
    await expect(page.getByText('Добавить расход')).toBeVisible();
    await page.getByRole('button', { name: 'Обед / Еда' }).click();
    await page.locator('input[placeholder="0"]').fill('450');
    await page.getByRole('button', { name: 'Записать' }).click();

    // Verify expense reflected
    await expect(page.getByText('Добавить расход')).not.toBeVisible();
    await expect(page.locator('text=/-450/')).toBeVisible();
  });

  test('completes shift and verifies it appears in History tab', async ({ page }) => {
    // 1. Start shift with odometer 150000
    await page.getByRole('button', { name: 'Начать смену' }).click();
    await page.locator('input[placeholder="145200"]').fill('150000');
    await page.getByRole('button', { name: 'Поехали' }).click();

    // 2. Add revenue +6000 ₽
    await page.getByRole('button', { name: 'Касса' }).click();
    await page.locator('input[type="number"]').fill('6000');
    await page.getByRole('button', { name: 'Записать' }).click();

    // 3. Complete shift
    await page.getByRole('button', { name: 'Завершить смену' }).click();
    await expect(page.getByText('Итоги смены')).toBeVisible();

    // In completion modal, verify gross revenue was transferred
    await expect(page.locator('input[value="6000"]')).toBeVisible();

    // Submit modal (click button "Сохранить смену")
    await page.getByRole('button', { name: 'Сохранить смену' }).click();

    // Active shift cleared -> "Начать смену" back
    await expect(page.getByRole('button', { name: 'Начать смену' })).toBeVisible();

    // 4. Switch to History tab
    await page.getByRole('button', { name: 'История' }).click();
    await expect(page.getByText('История (1)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible();
  });

  test('cancels active shift upon confirmation', async ({ page }) => {
    // Start shift
    await page.getByRole('button', { name: 'Начать смену' }).click();
    await page.getByRole('button', { name: 'Поехали' }).click();
    await expect(page.getByText('На линии')).toBeVisible();

    // Handle dialog
    page.once('dialog', dialog => dialog.accept());

    // Click cancel button
    await page.locator('button[title="Сбросить смену"]').click();

    // Active shift cleared, back to start
    await expect(page.getByText('На линии')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Начать смену' })).toBeVisible();
  });
});
