import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/admin');
  await page.waitForSelector('input[type="text"]', { state: 'visible' });
  await page.locator('input[type="text"]').fill('admin');
  await page.locator('input[type="password"]').fill('Admin@123');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 20000 });
  // انتظر تحميل الصفحة بالكامل
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('Admin Login & Inventory Management', () => {
  // Dev mode cold-compiles admin routes on first hit, which can exceed a single
  // test's assertion window on slow disks. One retry absorbs that infra flake.
  test.describe.configure({ retries: 1 });

  test('admin login page loads', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Admin Portal/i })).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/admin-login.png' });
  });

  test('admin login with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);
    await page.screenshot({ path: 'e2e/screenshots/admin-dashboard.png' });
  });

  test('dashboard overview displays stats', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible({ timeout: 10000 });

    // استخدم filter بدل has-text - أكتر قوة
    await expect(page.locator('.glass').filter({ hasText: /Total Income/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.glass').filter({ hasText: /Pending Bookings/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.glass').filter({ hasText: /Products/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.glass').filter({ hasText: /Balance/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('inventory management - view products and update stock', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('link', { name: /Warehouse/i }).click();
    // The warehouse route cold-compiles on first hit in dev (slow disk), and the
    // heading only renders after the products fetch resolves — allow ample time.
    await expect(page.getByRole('heading', { name: /Warehouse/i })).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-inventory.png' });

    const firstProduct = page.locator('.glass').filter({ hasText: /Bajaj/i }).first();
    await expect(firstProduct).toBeVisible();

    const plusButton = firstProduct.locator('button').nth(1);
    await plusButton.click();

    await page.waitForTimeout(500);

    await page.screenshot({ path: 'e2e/screenshots/admin-inventory-updated.png' });
  });

  test('admin logout redirects to login', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: /Sign Out/i }).click();
    await expect(page.getByRole('heading', { name: /Admin Portal/i })).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-logout.png' });
  });

  test('unauthenticated access to dashboard redirects to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { name: /Admin Portal/i })).toBeVisible({ timeout: 10000 });
  });

  test('admin login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForSelector('input[type="text"]', { state: 'visible' });
    await page.locator('input[type="text"]').fill('wronguser');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.screenshot({ path: 'e2e/screenshots/admin-login-error-filled.png' });
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-login-error.png' });
  });
});
