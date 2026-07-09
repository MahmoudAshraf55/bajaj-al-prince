import { test, expect } from '@playwright/test';

test.describe('Contact Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#contact');
    // ✅ تحسين: انتظر الصفحة تحميل بشكل كامل
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('contact section is visible on home page', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await expect(contactSection).toBeVisible({ timeout: 10000 });
    await contactSection.scrollIntoViewIfNeeded();
    await expect(contactSection.getByRole('heading', { name: /Contact/i }))
      .toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/contact-section.png' });
  });

  test('displays contact info cards', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await expect(contactSection).toBeVisible({ timeout: 10000 });
    await contactSection.scrollIntoViewIfNeeded();
    await expect(contactSection.getByText(/0122 137 0120/i))
      .toBeVisible({ timeout: 10000 });
    await expect(contactSection.getByText(/0155 123 3908/i))
      .toBeVisible({ timeout: 10000 });
    await expect(contactSection.getByText(/Location/i))
      .toBeVisible({ timeout: 10000 });
  });
});
