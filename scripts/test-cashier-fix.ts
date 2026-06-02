import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login
  await page.goto('http://localhost:3000/admin/');
  await page.waitForTimeout(1000);
  await page.locator('input[type="text"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);

  console.log('After login URL:', page.url());

  if (!page.url().includes('/admin/dashboard')) {
    console.log('Login failed');
    await page.screenshot({ path: '/tmp/cashier-login-fail.png' });
    await browser.close();
    return;
  }

  // 2. Go to Cashier tab
  // Find tab by text
  const tabs = await page.locator('nav button, aside button, [role="tab"], button').all();
  for (const tab of tabs) {
    const text = await tab.textContent().catch(() => '');
    if (text && (text.toLowerCase().includes('cashier') || text.includes('كاشير') || text.includes('Receipt'))) {
      await tab.click();
      console.log('Clicked cashier tab:', text.trim());
      break;
    }
  }
  await page.waitForTimeout(1500);

  // 3. Check for error boundary
  const content = await page.content();
  const hasCrash = content.includes('Cannot read properties of undefined') ||
                   content.includes('Error:') && content.includes('type');
  console.log('Has crash error:', hasCrash);

  // 4. Screenshot
  await page.screenshot({ path: '/tmp/cashier-tab.png' });
  console.log('Screenshot: /tmp/cashier-tab.png');

  // 5. Check console
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.waitForTimeout(500);
  console.log('Console errors:', errors.length);
  for (const e of errors) console.log(' ', e.substring(0, 120));

  await browser.close();
})();
