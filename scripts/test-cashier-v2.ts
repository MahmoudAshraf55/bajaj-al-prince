import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  // 1. Login
  await page.goto('http://localhost:3000/admin/');
  await page.waitForTimeout(1000);
  await page.locator('input[type="text"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);

  if (!page.url().includes('/admin/dashboard')) {
    console.log('Login failed');
    await browser.close();
    return;
  }

  // 2. Overview screenshot
  await page.screenshot({ path: '/tmp/1-overview-before.png' });

  // 3. Cashier tab
  const allBtns = await page.locator('aside nav button, aside button, nav button').all();
  for (const btn of allBtns) {
    const t = await btn.textContent().catch(() => '');
    if (t && (t.toLowerCase().includes('cashier') || t.includes('كاشير') || t.includes('Receipt'))) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/2-cashier-tab.png' });

  // 4. Check transaction count
  const txCountText = await page.locator('text=/\\d+ records|\\d+ سجل/').first().textContent().catch(() => 'unknown');
  console.log('Transaction count text:', txCountText);

  // 5. Add income 999
  const forms = await page.locator('form').all();
  for (const form of forms) {
    const btnText = await form.locator('button[type="submit"]').first().textContent().catch(() => '');
    if (btnText && (btnText.toLowerCase().includes('income') || btnText.includes('دخل'))) {
      const inputs = await form.locator('input').all();
      if (inputs[0]) await inputs[0].fill('999');
      if (inputs[1]) await inputs[1].fill('Playwright test income');
      await form.locator('button[type="submit"]').first().click();
      console.log('Added income 999');
      break;
    }
  }
  await page.waitForTimeout(1500);

  // 6. Add expense 111
  for (const form of forms) {
    const btnText = await form.locator('button[type="submit"]').first().textContent().catch(() => '');
    if (btnText && (btnText.toLowerCase().includes('expense') || btnText.includes('مصروف'))) {
      const inputs = await form.locator('input').all();
      if (inputs[0]) await inputs[0].fill('111');
      if (inputs[1]) await inputs[1].fill('Playwright test expense');
      await form.locator('button[type="submit"]').first().click();
      console.log('Added expense 111');
      break;
    }
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/3-cashier-after-add.png' });

  // 7. Back to overview
  for (const btn of allBtns) {
    const t = await btn.textContent().catch(() => '');
    if (t && (t.toLowerCase().includes('overview') || t.includes('إجمالي') || t.includes('Dashboard') || t.includes('لوحة'))) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/4-overview-after.png' });

  // 8. Read visible numbers
  const body = await page.textContent('body') || '';
  const numbers = body.match(/[\d,]+\s*EGP/g) || [];
  console.log('\nVisible EGP amounts on overview:', numbers);

  console.log('\nConsole errors:', errors.length);
  for (const e of errors) console.log(' ', e.substring(0, 120));

  await browser.close();
})();
