import { test, expect } from '@playwright/test';

test.describe('Contact Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#contact');
  });

  test('contact section is visible on home page', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await contactSection.scrollIntoViewIfNeeded();
    await expect(contactSection.getByRole('heading', { name: /Contact/i })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/contact-section.png' });
  });

  test('displays contact info cards', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await contactSection.scrollIntoViewIfNeeded();
    await expect(contactSection.getByText(/0122 137 0120/i)).toBeVisible();
    await expect(contactSection.getByText(/0155 123 3908/i)).toBeVisible();
    await expect(contactSection.getByText(/Location/i)).toBeVisible();
  });
});
