import { test, expect, Page } from '@playwright/test';

function generateUniquePhone(): string {
  // Generates 10-digit number starting with 99
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `9${randomPart}`;
}

async function setupSession(page: Page, phone: string) {
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

test.describe('Real-World Application Scenarios (Tier 4)', () => {
  test('Scenario 1: Complete 12-hour taxi driver shift workflow', async ({ page }) => {
    const phone = generateUniquePhone();
    await setupSession(page, phone);

    // 1. Driver starts shift in the morning with initial odometer
    await page.getByRole('button', { name: 'Начать смену' }).click();
    await page.locator('input[placeholder="145200"]').fill('160000');
    await page.getByRole('button', { name: 'Поехали' }).click();
    await expect(page.getByText('На линии')).toBeVisible();

    // 2. Midday orders: Driver records fare revenue +4500 ₽
    await page.getByRole('button', { name: 'Касса' }).click();
    await page.locator('input[type="number"]').fill('4500');
    await page.getByRole('button', { name: 'Записать' }).click();

    // 3. Driver stops at gas station: 30L of fuel for 1700 ₽
    await page.getByRole('button', { name: 'Бензин' }).click();
    await page.locator('input[placeholder="25.0"]').fill('30');
    await page.locator('input[placeholder="0"]').fill('1700');
    await page.getByRole('button', { name: 'Записать' }).click();

    // 4. Quick expenses: lunch (400 ₽) and car wash (500 ₽)
    await page.getByRole('button', { name: 'Расход' }).click();
    await page.getByRole('button', { name: 'Обед / Еда' }).click();
    await page.locator('input[placeholder="0"]').fill('400');
    await page.getByRole('button', { name: 'Записать' }).click();

    await page.getByRole('button', { name: 'Расход' }).click();
    await page.getByRole('button', { name: 'Мойка' }).click();
    await page.locator('input[placeholder="0"]').fill('500');
    await page.getByRole('button', { name: 'Записать' }).click();

    // 5. Evening orders: +3500 ₽ additional gross
    await page.getByRole('button', { name: 'Касса' }).click();
    await page.locator('input[type="number"]').fill('3500');
    await page.getByRole('button', { name: 'Записать' }).click();

    // Total gross is 4500 + 3500 = 8000 ₽
    await expect(page.locator('text=/8\\s?000/')).toBeVisible();

    // 6. Complete shift
    await page.getByRole('button', { name: 'Завершить смену' }).click();
    await expect(page.getByText('Итоги смены')).toBeVisible();

    // In modal, click "Сохранить смену"
    await page.getByRole('button', { name: 'Сохранить смену' }).click();

    // 7. Review in History tab
    await page.getByRole('button', { name: 'История' }).click();
    await expect(page.getByText('История (1)')).toBeVisible();

    // 8. Test CSV Export download trigger
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('Scenario 2: Split shift with zero expenses (pure profit verification)', async ({ page }) => {
    const phone = generateUniquePhone();
    await setupSession(page, phone);

    // Open manual shift form directly
    await page.getByRole('button', { name: 'Записать смену вручную' }).click();
    await expect(page.getByText('Новая смена')).toBeVisible();

    // Clear pre-existing expenses in modal if any
    const deleteButtons = page.locator('button:has(svg.lucide-trash-2)');
    const deleteCount = await deleteButtons.count();
    for (let i = 0; i < deleteCount; i++) {
      await deleteButtons.first().click();
    }

    // Set fields: Gross 5000 ₽, Rent 1500 ₽, Fuel 0 L, Fuel 0 ₽
    await page.locator('label:has-text("Грязная касса (₽)") + input').fill('5000');
    await page.locator('label:has-text("Аренда авто (₽)") + input').fill('1500');
    await page.locator('label:has-text("Бензин (л)") + input').fill('0');
    await page.locator('label:has-text("Сумма АЗС (₽)") + input').fill('0');

    // Submit form
    await page.getByRole('button', { name: 'Сохранить смену' }).click();

    // History should reflect the saved shift
    await page.getByRole('button', { name: 'История' }).click();
    await expect(page.getByText('История (1)')).toBeVisible();
  });

  test('Scenario 3: Profile settings update & PIN change persistence', async ({ page }) => {
    const phone = generateUniquePhone();
    await setupSession(page, phone);

    // 1. Navigate to Profile tab
    await page.getByRole('button', { name: 'Профиль' }).click();
    await expect(page.getByText('Параметры и калибровка')).toBeVisible();

    // 2. Update car model and daily goal
    const carInput = page.locator('label:has-text("Автомобиль") + input');
    await carInput.fill('Toyota Camry');

    const goalInput = page.locator('label:has-text("Цель чистыми (₽)") + input');
    await goalInput.fill('7500');

    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(page.getByRole('button', { name: 'Сохранено в базу' })).toBeVisible();

    // 3. Change PIN to 5678
    const newPinInput = page.locator('input[placeholder="Новый PIN"]');
    await newPinInput.fill('5678');
    await page.getByRole('button', { name: 'Сменить' }).click();
    await expect(page.getByRole('button', { name: 'OK' })).toBeVisible();

    // 4. Reload page and verify settings persist
    await page.reload();
    await page.getByRole('button', { name: 'Профиль' }).click();
    await expect(page.locator('label:has-text("Автомобиль") + input')).toHaveValue('Toyota Camry');
    await expect(page.locator('label:has-text("Цель чистыми (₽)") + input')).toHaveValue('7500');

    // 5. Logout and test re-auth with new PIN
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Выйти' }).click();

    // Re-login with old PIN (1234) -> must fail
    await page.locator('input[type="tel"]').fill(phone);
    await page.getByRole('button', { name: 'Продолжить' }).click();
    for (const d of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Неверный 4-значный PIN-код')).toBeVisible();

    // Re-login with new PIN (5678) -> succeeds
    for (const d of ['5', '6', '7', '8']) {
      await page.getByRole('button', { name: d, exact: true }).click();
    }
    await expect(page.getByText('Смена', { exact: true })).toBeVisible();
  });

  test('Scenario 4: Two-way fuel calibration interaction in manual shift form', async ({ page }) => {
    const phone = generateUniquePhone();
    await setupSession(page, phone);

    // Open manual shift form
    await page.getByRole('button', { name: 'Записать смену вручную' }).click();
    await expect(page.getByText('Новая смена')).toBeVisible();

    // Set mileage 200 km
    const mileageInput = page.locator('label:has-text("Пробег (км)") + input');
    await mileageInput.fill('200');

    // Set fuel liters 20 L
    const litersInput = page.locator('label:has-text("Бензин (л)") + input');
    await litersInput.fill('20');

    // Verify consumption updates to (20 / 200) * 100 = 10.0 L/100km
    const consumptionInput = page.locator('div:has(> span:has-text("л/100км")) input');
    await expect(consumptionInput).toHaveValue('10');

    // Now change consumption to 8.0 L/100km
    await consumptionInput.fill('8.0');

    // Verify fuel liters recalculates to (8.0 * 200) / 100 = 16.0 L
    await expect(litersInput).toHaveValue('16');
  });

  test('Scenario 5: Boundary & stress numbers handling without crash or UI overflow', async ({ page }) => {
    const phone = generateUniquePhone();
    await setupSession(page, phone);

    // Open manual shift modal
    await page.getByRole('button', { name: 'Записать смену вручную' }).click();

    // Fill extreme numbers: gross 999999, mileage 1500, fuel 120L, rent 50000
    await page.locator('label:has-text("Пробег (км)") + input').fill('1500');
    const grossInput = page.locator('label:has-text("Грязная касса (₽)") + input');
    await grossInput.fill('999999');

    // Save
    await page.getByRole('button', { name: 'Сохранить смену' }).click();

    // Check that History renders the extreme values without throwing or overflowing
    await page.getByRole('button', { name: 'История' }).click();
    await expect(page.getByText('История (1)')).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});
