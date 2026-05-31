import { test, expect } from '@playwright/test';

test.describe('Contact Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#contact');
  });

  test('contact section is visible on home page', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await contactSection.scrollIntoViewIfNeeded();
    await expect(contactSection.getByRole('heading', { name: /Contact Us/i })).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/contact-section.png' });
  });

  test('displays contact info cards', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await contactSection.scrollIntoViewIfNeeded();
    await expect(contactSection.locator('h3', { hasText: /Phone/i })).toBeVisible();
    await expect(contactSection.locator('h3', { hasText: /Email/i })).toBeVisible();
    await expect(contactSection.locator('h3', { hasText: /Location/i })).toBeVisible();
    await expect(contactSection.getByText(/Cairo, Egypt/i)).toBeVisible();
  });

  test('successful contact form submission', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await contactSection.scrollIntoViewIfNeeded();

    await contactSection.getByPlaceholder(/John Doe/i).fill('Jane Doe');
    await contactSection.getByPlaceholder(/\+20 123 456 789/i).fill('+20 111 222 3333');
    await contactSection.getByPlaceholder(/john@example.com/i).fill('jane@example.com');
    await contactSection.getByPlaceholder(/How can we help you/i).fill('I am interested in purchasing a Bajaj Pulsar 180. Please provide pricing details.');

    await page.screenshot({ path: 'e2e/screenshots/contact-filled.png' });

    await contactSection.getByRole('button', { name: /Send Message/i }).click();

    await expect(contactSection.getByText(/Message sent successfully/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/contact-success.png' });
  });

  test('validates required fields', async ({ page }) => {
    const contactSection = page.locator('#contact');
    await contactSection.scrollIntoViewIfNeeded();

    const nameInput = contactSection.getByPlaceholder(/John Doe/i);
    await expect(nameInput).toHaveAttribute('required', '');

    const emailInput = contactSection.getByPlaceholder(/john@example.com/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
  });
});
