import { test, expect, Page } from '@playwright/test';

const ADMIN_PAGES: Array<[string, string]> = [
  ['/admin/accounting/', 'accounting'],
  ['/admin/accounting/periods/', 'accounting-periods'],
  ['/admin/bookings/', 'bookings'],
  ['/admin/customers/', 'customers'],
  ['/admin/devices/', 'devices'],
  ['/admin/inventory-counts/', 'inventory-counts'],
  ['/admin/manufacturers/', 'manufacturers'],
  ['/admin/market/', 'market'],
  ['/admin/pos/', 'pos'],
  ['/admin/pos/history/', 'pos-history'],
  ['/admin/purchase-orders/import/', 'purchase-orders-import'],
  ['/admin/reports/scans/', 'reports-scans'],
  ['/admin/settings/', 'settings'],
  ['/admin/supplier-payments/', 'supplier-payments'],
  ['/admin/vehicle-models/', 'vehicle-models'],
  ['/admin/vehicles/', 'vehicles'],
  ['/admin/whatsapp/', 'whatsapp'],
  ['/admin/work-orders/', 'work-orders'],
];

async function loginAsAdmin(page: Page) {
  await page.goto('/admin');
  await page.waitForSelector('input[type="text"]', { state: 'visible' });
  // pressSequentially: fill() does not always trigger React's onChange on WebKit
  await page.locator('input[type="text"]').pressSequentially('admin', { delay: 10 });
  await page.locator('input[type="password"]').pressSequentially('Admin@123', { delay: 10 });
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText(/Admin Dashboard/i)).toBeVisible({ timeout: 20000 });
  // Let the post-login client-side redirect to /admin/dashboard/ fully settle before next goto
  await page.waitForURL(/\/admin\/dashboard\/?$/, { timeout: 10000 });
  await page.waitForTimeout(500);
}

test.describe('Admin pages render smoke tests', () => {
  for (const [path, slug] of ADMIN_PAGES) {
    test(`renders ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      // Dev-only HMR noise: WebKit rejects the _next/static/webpack/*.hot-update.json
      // fetch (CORS) during development, producing an uncaught page error. It does not
      // occur in production builds, so filter it out of the strict error check.
      const isDevHmrNoise = (msg: string) => msg.includes('webpack.hot-update');

      await loginAsAdmin(page);

      // Retry once: on WebKit the post-login client redirect can still be in
      // flight and hijack the first goto (browser ends up on /admin/dashboard/).
      try {
        await page.goto(path, { timeout: 30000 });
      } catch {
        await page.goto(path, { timeout: 30000 });
      }
      await page.waitForLoadState('domcontentloaded');

      // Admin shell (sidebar with Dashboard link) renders
      await expect(page.locator('a[href*="/admin/dashboard"]').first()).toBeVisible({ timeout: 20000 });

      // Let client-side data fetching settle
      await page.waitForTimeout(1000);

      // No Next.js error boundary or uncaught page errors
      await expect(page.getByText(/Something went wrong|Application error/i)).toHaveCount(0);
      expect(errors.filter((m) => !isDevHmrNoise(m)), `Uncaught page errors on ${path}`).toEqual([]);

      await page.screenshot({ path: `e2e/screenshots/admin-${slug}.png`, fullPage: true });
    });
  }
});
