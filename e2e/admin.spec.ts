import { test, expect } from '@playwright/test';

test.describe('Admin Login & Inventory Management', () => {
  test('admin login page loads', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Admin Portal/i })).toBeVisible();
    await expect(page.getByPlaceholder(/admin/i)).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/admin-login.png' });
  });

  test('admin login with valid credentials', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/admin/i).fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.screenshot({ path: 'e2e/screenshots/admin-login-filled.png' });

    await page.getByRole('button', { name: /Sign In/i }).click();

    await expect(page.getByText(/Dashboard Overview/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-dashboard.png' });
  });

  test('admin login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/admin/i).fill('wronguser');
    await page.getByPlaceholder('••••••••').fill('wrongpass');
    await page.getByRole('button', { name: /Sign In/i }).click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-login-error.png' });
  });

  test('dashboard overview displays stats', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/admin/i).fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByRole('heading', { name: /Dashboard Overview/i })).toBeVisible({ timeout: 10000 });

    await expect(page.locator('.glass:has-text("Total Messages")')).toBeVisible();
    await expect(page.locator('.glass:has-text("Pending Bookings")')).toBeVisible();
    await expect(page.locator('.glass:has-text("Products")').first()).toBeVisible();
    await expect(page.locator('.glass:has-text("Balance")').first()).toBeVisible();
  });

  test('inventory management - view products and update stock', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/admin/i).fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByText(/Dashboard Overview/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Inventory/i }).click();
    await expect(page.getByRole('heading', { name: /Inventory/i })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/admin-inventory.png' });

    const firstProduct = page.locator('.glass').filter({ hasText: /Bajaj Pulsar 180/i }).first();
    await expect(firstProduct).toBeVisible();

    const plusButton = firstProduct.locator('button').nth(1);
    await plusButton.click();

    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/admin-inventory-updated.png' });
  });

  test('admin logout redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder(/admin/i).fill('admin');
    await page.getByPlaceholder('••••••••').fill('admin123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    await expect(page.getByText(/Dashboard Overview/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page.getByRole('heading', { name: /Admin Portal/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-logout.png' });
  });

  test('unauthenticated access to dashboard redirects to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { name: /Admin Portal/i })).toBeVisible({ timeout: 10000 });
  });
});
