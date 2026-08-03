import { test, expect } from '@playwright/test';
import { safeScreenshot } from './utils/screenshot';

test.describe('Market (public)', () => {
  test('market page lists products', async ({ page }) => {
    await page.goto('/market/');
    await expect(page.getByRole('heading', { name: 'Market' })).toBeVisible();
    const firstCard = page.locator('a[href^="/market/"]').first();
    await expect(firstCard).toBeAttached({ timeout: 15000 });
    await safeScreenshot(page, 'e2e/screenshots/market-listing.png', { fullPage: true });
  });

  test('product detail page renders', async ({ page }) => {
    await page.goto('/market/');
    const card = page.locator('a[href^="/market/"]').first();
    await expect(card).toBeVisible({ timeout: 15000 });

    const href = (await card.getAttribute('href')) ?? '';
    expect(href).toMatch(/^\/market\/.+/);

    try {
      await card.click({ timeout: 10000 });
      await page.waitForURL(/\/market\/.+/, { timeout: 15000 });
    } catch {
      // Dev-mode hydration can stall (framer-motion keeps cards visibility:hidden)
      // and the Neon serverless DB can hiccup on the detail-route fetch, either of
      // which aborts the soft navigation. Retry with a full navigation instead.
      await page.goto(href);
    }
    await expect(page).toHaveURL(/\/market\/.+/, { timeout: 15000 });
    await expect(page.getByText(/Back to Market/i)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/EGP/i).first()).toBeVisible();
    await safeScreenshot(page, 'e2e/screenshots/market-product.png', { fullPage: true });
  });

  test('product search filters results', async ({ page }) => {
    await page.goto('/market/');
    const search = page.getByPlaceholder(/Search products/i);
    await expect(search).toBeVisible({ timeout: 15000 });

    // Use pressSequentially: fill() does not trigger React's onChange on WebKit
    await search.pressSequentially('zzzzz-nonexistent-product', { delay: 10 });
    await expect(page.getByText(/No products found|لا توجد منتجات/i)).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a[href^="/market/"]')).toHaveCount(0);
  });
});
