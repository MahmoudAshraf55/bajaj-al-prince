import { test, expect } from '@playwright/test';

function getNextAvailableDate(): string {
  const today = new Date();
  let date = new Date(today);
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
    await expect(page.getByRole('heading', { name: /Book Maintenance/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Your full name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/\+20 123 456 789/i).first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/booking-form.png' });
  });

  test('successful booking submission', async ({ page }) => {
    const date = getNextAvailableDate();

    await page.getByPlaceholder(/Your full name/i).fill('Test User');
    await page.getByPlaceholder(/\+20 123 456 789/i).first().fill('+20 100 000 0000');
    await page.getByPlaceholder(/Bajaj Pulsar 180/i).fill('Bajaj Boxer 150');
    await page.getByPlaceholder(/Describe the issue/i).fill('Oil change and general checkup');
    await page.locator('input[type="date"]').fill(date);
    await page.locator('select').filter({ has: page.locator('option[value="21:30"]') }).selectOption('21:30');

    await page.screenshot({ path: 'e2e/screenshots/booking-filled.png' });

    await page.getByRole('button', { name: /Request Booking/i }).click();

    await expect(page.getByText(/Booking Requested!/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/booking-success.png' });
  });

  test('validates required fields', async ({ page }) => {
    await page.getByRole('button', { name: /Request Booking/i }).click();

    const nameInput = page.getByPlaceholder(/Your full name/i);
    await expect(nameInput).toHaveAttribute('required', '');
    await page.screenshot({ path: 'e2e/screenshots/booking-validation.png' });
  });

  test('shows working hours notice', async ({ page }) => {
    await expect(page.getByText(/Working hours: 10:00 AM - 10:00 PM/i)).toBeVisible();
  });
});
