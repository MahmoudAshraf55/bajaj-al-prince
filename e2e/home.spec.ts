import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero section with title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Bajaj/i);
    await page.screenshot({ path: 'e2e/screenshots/home-hero.png', fullPage: false });
  });

  test('displays Story section', async ({ page }) => {
    const story = page.locator('#story');
    await story.scrollIntoViewIfNeeded();
    await expect(story).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/home-story.png', fullPage: false });
  });

  test('displays Services section', async ({ page }) => {
    const services = page.locator('#services');
    await services.scrollIntoViewIfNeeded();
    await expect(services).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/home-services.png', fullPage: false });
  });

  test('displays Contact section', async ({ page }) => {
    const contact = page.locator('#contact');
    await contact.scrollIntoViewIfNeeded();
    await expect(contact.getByRole('heading', { name: /Contact/i })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/home-contact.png', fullPage: false });
  });

  test('navigation links work', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: /Market/i })).toBeVisible();
    await expect(header.getByRole('link', { name: /Book Now/i })).toBeVisible();
    await expect(header.getByRole('link', { name: /Our Story/i })).toBeVisible();
  });

  test('page is responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const screenshotPath = 'e2e/screenshots/home-mobile.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
  });
});
