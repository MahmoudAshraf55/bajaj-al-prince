import { test, expect } from '@playwright/test';

test.describe('Market Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/market');
  });

  test('page loads with title and products', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Product Market/i })).toBeVisible();
    await expect(page.getByText(/Bajaj Pulsar 180/i)).toBeVisible();
    await expect(page.getByText(/Bajaj Boxer 150/i)).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/market-page.png' });
  });

  test('displays pricing notice', async ({ page }) => {
    await expect(page.getByText(/Prices are subject to market fluctuations/i)).toBeVisible();
  });

  test('search filters products', async ({ page }) => {
    await page.getByPlaceholder(/Search products/i).fill('Pulsar');
    await expect(page.getByText(/Bajaj Pulsar 180/i)).toBeVisible();
    await expect(page.getByText(/Bajaj Boxer 150/i)).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/market-search.png' });
  });

  test('category filters work', async ({ page }) => {
    await page.getByRole('button', { name: /Spare Parts/i }).click();
    await expect(page.getByText(/Engine Oil 4T/i)).toBeVisible();
    await expect(page.getByText(/Bajaj Pulsar 180/i)).not.toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/market-category.png' });
  });

  test('shows out of stock badge when stock is zero', async ({ page }) => {
    await page.getByRole('button', { name: /Accessories/i }).click();
    await expect(page.getByText(/Phone Mount/i)).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/market-accessories.png' });
  });

  test('search shows no results state', async ({ page }) => {
    await page.getByPlaceholder(/Search products/i).fill('NonexistentProduct123');
    await expect(page.getByText(/No products found/i)).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/market-no-results.png' });
  });
});
