import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000); // wait for 3D to load

  // Screenshot at top (hero)
  await page.screenshot({ path: '/tmp/3d-hero.png', fullPage: false });
  console.log('Screenshot saved: /tmp/3d-hero.png');

  // Scroll down to trigger rotation
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/3d-scrolled.png', fullPage: false });
  console.log('Screenshot saved: /tmp/3d-scrolled.png');

  // Check console for 3D-related errors
  const logs: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') logs.push(msg.text());
  });
  await page.waitForTimeout(500);

  console.log('3D errors:', logs.length > 0 ? logs : 'None');

  await browser.close();
})();
