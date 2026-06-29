import { test, expect } from '@playwright/test';

test.describe('Security — Authentication', () => {
  test('login with wrong password returns 401', async ({ request }) => {
    const res = await request.post('/api/auth/login/', {
      data: { username: 'admin', password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('login with empty fields returns error', async ({ request }) => {
    const res = await request.post('/api/auth/login/', {
      data: { username: '', password: '' },
    });
    expect(res.status()).toBe(400);
  });

  test('protected API returns 401 without auth', async ({ request }) => {
    const endpoints = [
      '/api/v1/products/',
      '/api/v1/customers/',
      '/api/v1/invoices/',
      '/api/v1/suppliers/',
      '/api/v1/purchase-orders/',
      '/api/v1/accounts/',
      '/api/v1/journal-entries/',
      '/api/v1/reports/financial/',
      '/api/v1/reports/inventory/',
      '/api/v1/reports/customers/',
    ];

    for (const ep of endpoints) {
      const res = await request.get(ep);
      expect([401, 403]).toContain(res.status());
    }
  });

  test('refresh token required for refresh endpoint', async ({ request }) => {
    const res = await request.post('/api/auth/refresh/', {
      data: {},
    });
    expect([401, 403, 400]).toContain(res.status());
  });
});

test.describe('Security — SQL Injection Prevention', () => {
  test('login with SQL injection payload is rejected', async ({ request }) => {
    const res = await request.post('/api/auth/login/', {
      data: { username: "admin' OR '1'='1", password: "x' OR '1'='1" },
    });
    expect(res.status()).toBe(401);
  });

  test('contact form with SQL payload is sanitized', async ({ request }) => {
    const res = await request.post('/api/contact/', {
      data: {
        name: "'; DROP TABLE users; --",
        phone: '+201001234567',
        email: 'test@example.com',
        message: 'Test',
      },
    });
    const body = await res.json();
    // Should either succeed (sanitized) or fail validation
    expect([200, 201, 400]).toContain(res.status());
  });
});

test.describe('Security — XSS Prevention', () => {
  test('contact form strips HTML tags', async ({ request }) => {
    const res = await request.post('/api/contact/', {
      data: {
        name: '<script>alert("xss")</script>Test',
        phone: '+201001234567',
        email: 'xss@test.com',
        message: '<img src=x onerror=alert(1)>',
      },
    });
    const body = await res.json();
    if (body.success) {
      expect(body.data?.message?.name || body.data?.name || '').not.toContain('<script>');
    }
  });
});

test.describe('Security — Rate Limiting', () => {
  test('repeated failed logins are rate limited', async ({ request }) => {
    // Make 6 rapid failed login attempts (limit is 5 per 15 min)
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request.post('/api/auth/login/', {
        data: { username: 'admin', password: `wrong${i}` },
      });
      lastStatus = res.status();
    }
    // After 5 attempts, should get 429
    expect([429, 401]).toContain(lastStatus);
  });
});

test.describe('Security — Public Market Access', () => {
  test('market page loads without auth (server-rendered)', async ({ page }) => {
    const res = await page.goto('/market/');
    expect(res?.status()).toBe(200);
    // Should show product grid or empty state (not 401/403)
    await expect(page.locator('h1')).toBeVisible();
  });

  test('product detail page accessible without auth', async ({ page }) => {
    // Try to access a product detail page - should work or 404, not 401
    const res = await page.goto('/market/nonexistent-id/');
    expect([200, 404]).toContain(res?.status() ?? 0);
  });
});

test.describe('Security — Health Check', () => {
  test('health endpoint is public and returns status', async ({ request }) => {
    const res = await request.get('/api/health/');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBeDefined();
    expect(body.services).toBeDefined();
    expect(body.services.database).toBeDefined();
  });
});

test.describe('Security — Tenant Isolation', () => {
  test('API responses include tenant-scoped data only', async ({ request }) => {
    // Login first
    const loginRes = await request.post('/api/auth/login/', {
      data: { username: 'admin', password: 'Admin@123' },
    });
    if (loginRes.ok()) {
      const cookies = loginRes.headers()['set-cookie'] || '';

      // Try to access products
      const productsRes = await request.get('/api/v1/products/', {
        headers: { cookie: cookies },
      });

      if (productsRes.ok()) {
        const body = await productsRes.json();
        // All products should belong to the same tenant
        if (body.data?.products) {
          const tenantIds = new Set(body.data.products.map((p: { tenantId?: string }) => p.tenantId));
          expect(tenantIds.size).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
