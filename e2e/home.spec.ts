import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero section with title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Bajaj/i);
    await page.screenshot({ path: 'e2e/screenshots/home-hero.png', fullPage: false });
  });

  test('displays About section', async ({ page }) => {
    const about = page.locator('#about, section').filter({ hasText: /About/i });
    await about.scrollIntoViewIfNeeded();
    await expect(about).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/home-about.png', fullPage: false });
  });

  test('displays Services section', async ({ page }) => {
    const services = page.locator('#services');
    await services.scrollIntoViewIfNeeded();
    await expect(services).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/home-services.png', fullPage: false });
  });

  test('displays Contact section with form', async ({ page }) => {
    const contact = page.locator('#contact');
    await contact.scrollIntoViewIfNeeded();
    await expect(contact.getByRole('heading', { name: /Contact/i })).toBeVisible();
    await expect(contact.getByPlaceholder(/John Doe/i)).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/home-contact.png', fullPage: false });
  });

  test('navigation links work', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Market/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Book Maintenance/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Admin Portal/i })).toBeVisible();
  });

  test('page is responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const screenshotPath = 'e2e/screenshots/home-mobile.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });
});
