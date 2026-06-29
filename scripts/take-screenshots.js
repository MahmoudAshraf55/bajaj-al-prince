const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as admin
  await page.goto('http://localhost:3000/admin');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const adminPages = [
    { path: '/admin/dashboard', name: 'admin-dashboard' },
    { path: '/admin/suppliers', name: 'admin-suppliers' },
    { path: '/admin/purchase-orders', name: 'admin-purchase-orders' },
    { path: '/admin/accounts', name: 'admin-accounts' },
    { path: '/admin/journal-entries', name: 'admin-journal-entries' },
    { path: '/admin/reports', name: 'admin-reports' },
    { path: '/admin/pos', name: 'admin-pos' },
    { path: '/admin/warehouse', name: 'admin-warehouse' },
    { path: '/admin/accounting', name: 'admin-accounting' },
    { path: '/admin/inventory-counts', name: 'admin-inventory-counts' },
    { path: '/admin/customers', name: 'admin-customers' },
    { path: '/admin/vehicles', name: 'admin-vehicles' },
    { path: '/admin/work-orders', name: 'admin-work-orders' },
    { path: '/admin/vehicle-models', name: 'admin-vehicle-models' },
  ];

  for (const p of adminPages) {
    try {
      await page.goto(`http://localhost:3000${p.path}`);
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: `public/screenshots/admin/${p.name}.png`,
        fullPage: false,
      });
      console.log(`Screenshot: ${p.name}`);
    } catch (e) {
      console.log(`Skipped: ${p.name} - ${e.message}`);
    }
  }

  // Logout for public pages
  await page.goto('http://localhost:3000/admin');
  await page.click('button:has-text("Sign Out")');
  await page.waitForTimeout(1000);

  // Public pages
  const publicPages = [
    { path: '/', name: 'home-hero' },
    { path: '/market', name: 'market' },
    { path: '/booking', name: 'booking' },
  ];

  for (const p of publicPages) {
    try {
      await page.goto(`http://localhost:3000${p.path}`);
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: `public/screenshots/public/${p.name}.png`,
        fullPage: false,
      });
      console.log(`Screenshot: ${p.name}`);
    } catch (e) {
      console.log(`Skipped: ${p.name} - ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
})().catch(console.error);
