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

  // 2. Go to Cashier tab
  const allBtns = await page.locator('aside button, nav button').all();
  for (const btn of allBtns) {
    const t = await btn.textContent().catch(() => '');
    if (t && (t.toLowerCase().includes('cashier') || t.includes('كاشير') || t.includes('Receipt'))) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/cashier-with-totals.png' });

  // 3. Read the totals on the cashier tab
  const bodyText = await page.textContent('body') || '';
  const incomeMatch = bodyText.match(/([\d,]+)\s*EGP/);
  console.log('First EGP amount visible:', incomeMatch ? incomeMatch[0] : 'none');

  // 4. Check for total cards
  const hasTotalIncome = bodyText ? bodyText.includes('إجمالي الدخل') || bodyText.includes('Total Income') : false;
  const hasTotalExpense = bodyText ? bodyText.includes('إجمالي المصروفات') || bodyText.includes('Total Expenses') : false;
  const hasNetBalance = bodyText ? bodyText.includes('الرصيد الصافي') || bodyText.includes('Net Balance') : false;
  console.log(`Has total income card: ${hasTotalIncome}`);
  console.log(`Has total expense card: ${hasTotalExpense}`);
  console.log(`Has net balance card: ${hasNetBalance}`);

  // 5. Add a small income
  const forms = await page.locator('form').all();
  for (const form of forms) {
    const btnText = await form.locator('button[type="submit"]').first().textContent().catch(() => '');
    if (btnText && (btnText.toLowerCase().includes('income') || btnText.includes('دخل'))) {
      const inputs = await form.locator('input').all();
      if (inputs[0]) await inputs[0].fill('123');
      if (inputs[1]) await inputs[1].fill('Final test income');
      await form.locator('button[type="submit"]').first().click();
      console.log('Clicked add income 123');
      break;
    }
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/cashier-after-add.png' });

  console.log('\nConsole errors:', errors.length);
  for (const e of errors) console.log(' ', e.substring(0, 120));

  await browser.close();
})();
