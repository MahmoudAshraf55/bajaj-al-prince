import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login as admin
  console.log('1. Navigating to admin login...');
  await page.goto('http://localhost:3000/admin/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Fill login form
  const usernameInput = await page.locator('input[type="text"], input[name="username"], input[placeholder*="user" i]').first();
  const passwordInput = await page.locator('input[type="password"]').first();
  const submitBtn = await page.locator('button[type="submit"]').first();

  if (await usernameInput.count() > 0 && await passwordInput.count() > 0) {
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await submitBtn.click();
    console.log('   Submitted login form');
    await page.waitForTimeout(2000);
  } else {
    console.log('   Login form not found, maybe already logged in');
  }

  // 2. Check if on dashboard
  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);

  if (currentUrl.includes('/admin/dashboard')) {
    console.log('2. Successfully on dashboard');

    // 3. Navigate to Cashier tab
    const cashierTab = await page.locator('text=Cashier, text= cashier, text=الكاشير, [id="cashier"]').first();
    if (await cashierTab.count() > 0) {
      await cashierTab.click();
      console.log('3. Clicked Cashier tab');
      await page.waitForTimeout(1000);
    }

    // 4. Check for the transaction list / add form
    const pageContent = await page.content();
    const hasError = pageContent.includes('Error') || pageContent.includes('error');
    console.log(`   Page has error text: ${hasError}`);

    // 5. Screenshot
    await page.screenshot({ path: '/tmp/admin-dashboard.png' });
    console.log('   Screenshot saved: /tmp/admin-dashboard.png');
  } else {
    console.log('2. Not on dashboard - check login credentials');
    await page.screenshot({ path: '/tmp/admin-login.png' });
    console.log('   Screenshot saved: /tmp/admin-login.png');
  }

  // 6. Check console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });
  await page.waitForTimeout(500);

  console.log(`\nConsole/Page errors: ${consoleErrors.length}`);
  for (const e of consoleErrors.slice(0, 5)) {
    console.log(`  ${e.substring(0, 120)}`);
  }

  await browser.close();
})();
