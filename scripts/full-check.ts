import { chromium } from '@playwright/test';

const pages = [
  { url: 'http://localhost:3000/', name: 'Home' },
  { url: 'http://localhost:3000/booking/', name: 'Booking' },
  { url: 'http://localhost:3000/market/', name: 'Market' },
  { url: 'http://localhost:3000/admin/', name: 'Admin Login' },
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  let totalErrors = 0;

  for (const pageInfo of pages) {
    const page = await context.newPage();
    const errors: { type: string; text: string }[] = [];
    const httpErrors: { status: number; url: string }[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push({ type: 'error', text: msg.text() });
    });
    page.on('pageerror', (err) => {
      errors.push({ type: 'pageerror', text: err.message });
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        httpErrors.push({ status: response.status(), url: response.url() });
      }
    });

    try {
      await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    } catch {
      errors.push({ type: 'navigation', text: `Failed to load ${pageInfo.url}` });
    }

    const pageErrors = errors.length + httpErrors.length;
    totalErrors += pageErrors;

    console.log(`\n=== ${pageInfo.name} (${pageInfo.url}) ===`);
    console.log(`  Console/Page errors: ${errors.length}`);
    console.log(`  HTTP errors (>=400): ${httpErrors.length}`);
    for (const e of errors.slice(0, 3)) {
      console.log(`  [${e.type}] ${e.text.substring(0, 120)}`);
    }
    for (const h of httpErrors.slice(0, 3)) {
      console.log(`  [HTTP ${h.status}] ${h.url.substring(0, 120)}`);
    }

    await page.close();
  }

  console.log(`\n========================================`);
  console.log(`TOTAL ERRORS ACROSS ALL PAGES: ${totalErrors}`);
  console.log(`========================================\n`);

  await browser.close();
})();
