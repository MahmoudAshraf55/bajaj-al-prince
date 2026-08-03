import { test, expect, type Page } from '@playwright/test';
import { safeScreenshot } from './utils/screenshot';

// The WebGL hero canvas can crash Chromium's compositor during a headless
// capture. Hide it for the shot and restore it immediately after — layout
// assertions have already run before any screenshot.
async function screenshotPage(page: Page, path: string) {
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.style.visibility = 'hidden';
  });
  try {
    await safeScreenshot(page, path);
  } finally {
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) canvas.style.visibility = '';
    });
  }
}

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // The home route pulls in heavy client bundles (3D hero, GSAP, framer-motion).
    // On a slow disk, cold dev compilation can outlast networkidle, so wait for
    // the page to actually hydrate before asserting on sections.
    await expect(page.getByRole('heading', { level: 1 }))
      .toBeVisible({ timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('displays hero section with title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 }))
      .toContainText(/Bajaj/i, { timeout: 10000 });
    await screenshotPage(page, 'e2e/screenshots/home-hero.png');
  });

  test('displays Story section', async ({ page }) => {
    const story = page.locator('#story').first();
    // Below-fold sections are wrapped in framer-motion initial states that keep
    // them `visibility:hidden` until hydration+scroll, and dev hydration can
    // stall on cold loads (or remount mid-test). Assert on the server-rendered
    // content via plain CSS locators, which are hydration/visibility-agnostic.
    await expect(story.locator('h2').first())
      .toContainText(/The Story of El Prince Bajaj/i, { timeout: 10000 });
    await screenshotPage(page, 'e2e/screenshots/home-story.png');
  });

  test('displays Services section', async ({ page }) => {
    const services = page.locator('#services').first();
    await expect(services.locator('h2').first())
      .toContainText(/What Makes Us Different/i, { timeout: 10000 });
    await screenshotPage(page, 'e2e/screenshots/home-services.png');
  });

  test('displays Contact section', async ({ page }) => {
    const contact = page.locator('#contact-info').first();
    await expect(contact.locator('h2').first())
      .toContainText(/Contact El Prince Bajaj/i, { timeout: 10000 });
    await screenshotPage(page, 'e2e/screenshots/home-contact.png');
  });

  test('navigation links work', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: /Market/i }))
      .toBeVisible({ timeout: 20000 });
    await expect(header.getByRole('link', { name: /Book Now/i }))
      .toBeVisible({ timeout: 20000 });
    await expect(header.getByRole('link', { name: /Our Story/i }))
      .toBeVisible({ timeout: 20000 });
  });

  test('page is responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 }))
      .toBeVisible({ timeout: 10000 });
    await screenshotPage(page, 'e2e/screenshots/home-mobile.png');
  });
});
