import { test, expect } from '@playwright/test';

function getNextAvailableDate(): string {
  const today = new Date();
  const date = new Date(today);
  date.setDate(date.getDate() + 7);
  while (date.getDay() === 5) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().split('T')[0];
}

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/booking');
  });

  test('page loads with booking form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Book Service/i })).toBeVisible();
    await expect(page.locator('#booking-name')).toBeVisible();
    await expect(page.locator('#booking-phone')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/booking-form.png' });
  });

  test('successful booking submission', async ({ page }) => {
    const date = getNextAvailableDate();

    await page.locator('#booking-name').fill('Test User');
    await page.locator('#booking-phone').fill('1000000000');
    await page.locator('#booking-email').fill('test@example.com');
    await page.locator('#booking-model').selectOption('__other__');
    await page.locator('#booking-custom-model').fill('Bajaj Boxer 150');
    await page.locator('#booking-issue').fill('Oil change and general checkup');
    await page.locator('input[type="date"]').fill(date);
    await page.locator('#booking-time').selectOption('10:00');

    await page.screenshot({ path: 'e2e/screenshots/booking-filled.png' });

    await page.getByRole('button', { name: /Request Booking/i }).click();

    await expect(page.getByText(/Booking Requested!/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/booking-success.png' });
  });

  test('validates required fields', async ({ page }) => {
    await page.getByRole('button', { name: /Request Booking/i }).click();

    const nameInput = page.locator('#booking-name');
    await expect(nameInput).toHaveAttribute('required', '');
    await page.screenshot({ path: 'e2e/screenshots/booking-validation.png' });
  });

  test('shows working hours notice', async ({ page }) => {
    await expect(page.getByText(/Working hours: 10:00 AM - 10:00 PM/i)).toBeVisible();
  });
});
