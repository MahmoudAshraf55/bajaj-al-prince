import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login via API to set cookies
  await page.goto('http://localhost:3000/admin/');
  await page.waitForTimeout(500);

  // Use fetch to login and get cookies
  await page.evaluate(async () => {
    await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
  });
  await page.waitForTimeout(500);

  // 2. Navigate to dashboard
  await page.goto('http://localhost:3000/admin/dashboard/');
  await page.waitForTimeout(1500);

  if (!page.url().includes('/admin/dashboard')) {
    console.log('Not on dashboard, URL:', page.url());
    await page.screenshot({ path: '/tmp/debug-login.png' });
    await browser.close();
    return;
  }
  console.log('On dashboard');

  // 3. Click Cashier tab
  const btn = await page.locator('button', { hasText: /cashier|كاشير|Receipt/i }).first();
  if (await btn.count() > 0) {
    await btn.click();
    console.log('Clicked cashier tab');
  } else {
    console.log('Cashier tab not found');
    const allText = await page.locator('aside button, nav button').allTextContents();
    console.log('All buttons:', allText);
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/cashier-with-totals.png' });

  // 4. Check totals visible
  const body = await page.content();
  const hasIncome = body.includes('إجمالي الدخل') || body.includes('Total Income');
  const hasExpense = body.includes('إجمالي المصروفات') || body.includes('Total Expenses');
  const hasBalance = body.includes('الرصيد الصافي') || body.includes('Net Balance');
  console.log(`Total cards visible: income=${hasIncome}, expense=${hasExpense}, balance=${hasBalance}`);

  // 5. Add income 321
  const forms = await page.locator('form').all();
  for (const form of forms) {
    const submitBtn = form.locator('button[type="submit"]').first();
    const btnText = await submitBtn.textContent().catch(() => '');
    if (btnText && (btnText.toLowerCase().includes('income') || btnText.includes('دخل'))) {
      const inputs = await form.locator('input').all();
      if (inputs[0]) await inputs[0].fill('321');
      if (inputs[1]) await inputs[1].fill('Browser test income');
      await submitBtn.click();
      console.log('Added income 321');
      break;
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/cashier-after-submit.png' });

  const errors: string[] = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.waitForTimeout(500);

  console.log('Console errors:', errors.length);
  for (const e of errors) console.log(' ', e.substring(0, 120));

  await browser.close();
})();
