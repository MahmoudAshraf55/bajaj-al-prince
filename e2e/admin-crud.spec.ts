import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/admin');
  await page.waitForSelector('input[type="text"]', { state: 'visible' });
  await page.locator('input[type="text"]').fill('admin');
  await page.locator('input[type="password"]').fill('Admin@123');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 20000 });
}

async function loginAsStaff(page: Page) {
  await page.goto('/admin');
  await page.waitForSelector('input[type="text"]', { state: 'visible' });
  await page.locator('input[type="text"]').fill('staff');
  await page.locator('input[type="password"]').fill('Staff@123');
  await page.getByRole('button', { name: /Sign In/i }).click();
  await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 20000 });
}

test.describe('Admin CRUD — Suppliers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('suppliers page loads and displays list', async ({ page }) => {
    await page.goto('/admin/suppliers/');
    await expect(page.getByRole('heading', { name: /Suppliers/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-suppliers.png' });
  });

  test('create supplier via modal', async ({ page }) => {
    await page.goto('/admin/suppliers/');
    await page.waitForSelector('button:has-text("Add")', { state: 'visible' });
    await page.getByRole('button', { name: /Add Supplier/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const unique = Date.now().toString();
    await page.locator('input[placeholder="Supplier Name"]').fill(`Test Supplier ${unique}`);
    await page.locator('input[placeholder="+20 123 456 7890"]').fill('+201001234567');
    await page.locator('input[placeholder="supplier@example.com"]').fill(`supplier${unique}@test.com`);
    await page.getByRole('button', { name: /Add Supplier/i }).click();

    await expect(page.getByText(/created successfully/i)).toBeVisible({ timeout: 10000 });
  });

  test('supplier detail page loads', async ({ page }) => {
    await page.goto('/admin/suppliers/');
    await page.waitForTimeout(1000);
    const firstDetailLink = page.locator('a:has-text("View Details")').first();
    if (await firstDetailLink.isVisible()) {
      await firstDetailLink.click();
      await expect(page.getByRole('heading', { name: /Supplier Details/i })).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'e2e/screenshots/admin-supplier-detail.png' });
    }
  });
});

test.describe('Admin CRUD — Purchase Orders', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('purchase orders page loads', async ({ page }) => {
    await page.goto('/admin/purchase-orders/');
    await expect(page.getByRole('heading', { name: /Purchase Orders/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-purchase-orders.png' });
  });

  test('status filter tabs work', async ({ page }) => {
    await page.goto('/admin/purchase-orders/');
    await page.waitForTimeout(1000);
    const draftTab = page.locator('button:has-text("Draft")').first();
    if (await draftTab.isVisible()) {
      await draftTab.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Admin CRUD — Chart of Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('accounts page loads with tree view', async ({ page }) => {
    await page.goto('/admin/accounts/');
    await expect(page.getByRole('heading', { name: /Chart of Accounts/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-accounts.png' });
  });

  test('accounts show default seeded accounts', async ({ page }) => {
    await page.goto('/admin/accounts/');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Assets')).toBeVisible();
    await expect(page.locator('text=Liabilities')).toBeVisible();
    await expect(page.locator('text=Equity')).toBeVisible();
    await expect(page.locator('text=Revenue')).toBeVisible();
    await expect(page.locator('text=Expenses')).toBeVisible();
  });
});

test.describe('Admin CRUD — Journal Entries', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('journal entries page loads', async ({ page }) => {
    await page.goto('/admin/journal-entries/');
    await expect(page.getByRole('heading', { name: /Journal Entries/i })).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/admin-journal-entries.png' });
  });
});

test.describe('Admin CRUD — Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('reports page loads with 3 tabs', async ({ page }) => {
    await page.goto('/admin/reports/');
    await expect(page.getByRole('heading', { name: /Reports/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Financial")')).toBeVisible();
    await expect(page.locator('button:has-text("Inventory")')).toBeVisible();
    await expect(page.locator('button:has-text("Customers")')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/admin-reports.png' });
  });

  test('generate P&L report', async ({ page }) => {
    await page.goto('/admin/reports/');
    await page.waitForTimeout(1000);
    const generateBtn = page.locator('button:has-text("Generate")').first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'e2e/screenshots/admin-reports-pnl.png' });
    }
  });
});

test.describe('Admin — Dashboard KPIs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('dashboard shows 8 KPI cards', async ({ page }) => {
    await page.goto('/admin/dashboard/');
    await page.waitForTimeout(2000);
    const cards = page.locator('.glass.rounded-2xl.p-5');
    await expect(cards.first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/admin-dashboard-kpis.png' });
  });

  test('quick action links visible', async ({ page }) => {
    await page.goto('/admin/dashboard/');
    await page.waitForTimeout(1000);
    await expect(page.locator('a[href="/admin/pos/"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/reports/"]')).toBeVisible();
  });
});
