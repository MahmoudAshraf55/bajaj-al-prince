import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const logs: { type: string; text: string }[] = [];

  page.on('console', (msg) => {
    logs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', (err) => {
    logs.push({ type: 'pageerror', text: err.message });
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      logs.push({ type: 'http-error', text: `${response.status()} ${response.url()}` });
    }
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Filter out dev-server cache 404s (chunks/css from old builds)
  const realErrors = logs.filter((l) => {
    if (l.type === 'http-error' && /_next\/static\/.*\.(js|css)/.test(l.text)) return false;
    return l.type === 'error' || l.type === 'pageerror' || l.type === 'http-error';
  });

  console.log(`\n=== Real Errors: ${realErrors.length} ===\n`);
  for (const err of realErrors) {
    console.log(`[${err.type}] ${err.text}`);
  }

  await browser.close();
})();
