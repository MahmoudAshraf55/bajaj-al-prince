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
    console.log('Login failed, URL:', page.url());
    await browser.close();
    return;
  }
  console.log('Logged in');

  // 2. Go to Overview, record initial totals
  const overviewTab = await page.locator('nav button, aside button').filter({ hasText: /overview|Overview|لوحة|إجمالي/i }).first();
  if (await overviewTab.count()) await overviewTab.click();
  await page.waitForTimeout(500);

  const getTotals = async () => {
    const html = await page.content();
    const incomeMatch = html.match(/([\d,]+)\s*EGP/);
    return { htmlSnippet: html.match(/admin_total_income[\s\S]{0,200}/)?.[0] || 'no match' };
  };

  // Actually read the visible text
  const readCardValue = async (label: string) => {
    const cards = await page.locator('div.rounded-xl').all();
    for (const card of cards) {
      const text = await card.textContent().catch(() => '');
      if (text && text.includes(label)) {
        const numMatch = text.match(/([\d,]+)\s*EGP/);
        return numMatch ? parseInt(numMatch[1].replace(/,/g, '')) : null;
      }
    }
    return null;
  };

  let initialIncome = await readCardValue('admin_total_income') || 0;
  let initialExpense = await readCardValue('admin_total_expenses') || 0;
  let initialBalance = await readCardValue('admin_net_balance') || 0;
  console.log(`Initial: income=${initialIncome}, expense=${initialExpense}, balance=${initialBalance}`);

  // 3. Go to Cashier tab
  const cashierTab = await page.locator('nav button, aside button').filter({ hasText: /cashier|Cashier|كاشير/i }).first();
  if (await cashierTab.count()) await cashierTab.click();
  await page.waitForTimeout(1000);

  // 4. Add an income of 500
  const incomeForm = await page.locator('form').filter({ hasText: /add_income|Add Income|إضافة دخل/i }).first();
  if (await incomeForm.count()) {
    const inputs = await incomeForm.locator('input').all();
    if (inputs[0]) await inputs[0].fill('500');
    if (inputs[1]) await inputs[1].fill('Test income Playwright');
    const btn = await incomeForm.locator('button[type="submit"]').first();
    if (await btn.count()) await btn.click();
    console.log('Added income 500');
  }
  await page.waitForTimeout(1500);

  // 5. Add an expense of 200
  const expenseForm = await page.locator('form').filter({ hasText: /add_expense|Add Expense|إضافة مصروف/i }).first();
  if (await expenseForm.count()) {
    const inputs = await expenseForm.locator('input').all();
    if (inputs[0]) await inputs[0].fill('200');
    if (inputs[1]) await inputs[1].fill('Test expense Playwright');
    const btn = await expenseForm.locator('button[type="submit"]').first();
    if (await btn.count()) await btn.click();
    console.log('Added expense 200');
  }
  await page.waitForTimeout(1500);

  // 6. Back to Overview, check totals
  const overviewTab2 = await page.locator('nav button, aside button').filter({ hasText: /overview|Overview|لوحة|إجمالي/i }).first();
  if (await overviewTab2.count()) await overviewTab2.click();
  await page.waitForTimeout(1000);

  let newIncome = await readCardValue('admin_total_income') || 0;
  let newExpense = await readCardValue('admin_total_expenses') || 0;
  let newBalance = await readCardValue('admin_net_balance') || 0;
  console.log(`After: income=${newIncome}, expense=${newExpense}, balance=${newBalance}`);

  const incomeDiff = newIncome - initialIncome;
  const expenseDiff = newExpense - initialExpense;
  const balanceDiff = newBalance - initialBalance;

  console.log(`\nChanges: income +${incomeDiff}, expense +${expenseDiff}, balance +${balanceDiff}`);

  if (incomeDiff === 500 && expenseDiff === 200 && balanceDiff === 300) {
    console.log('✅ ALL TOTALS UPDATED CORRECTLY');
  } else {
    console.log('❌ TOTALS DID NOT UPDATE AS EXPECTED');
    console.log(`Expected: income +500, expense +200, balance +300`);
  }

  console.log(`\nConsole errors: ${errors.length}`);
  for (const e of errors) console.log(' ', e.substring(0, 120));

  await page.screenshot({ path: '/tmp/cashier-test-result.png' });
  await browser.close();
})();
