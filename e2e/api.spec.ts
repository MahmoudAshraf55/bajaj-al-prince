import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('GET /api/health returns UP', async ({ request }) => {
    const res = await request.get('/api/health/');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('UP');
  });
});

test.describe('Auth API', () => {
  test('POST /api/auth/login with invalid credentials returns 401', async ({ request }) => {
    const res = await request.post('/api/auth/login/', {
      data: { username: 'invalid', password: 'invalid' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/auth/me without token returns error', async ({ request }) => {
    const res = await request.get('/api/auth/me/');
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

test.describe('Contact API (public)', () => {
  test('POST /api/contact with valid data creates message', async ({ request }) => {
    const unique = Date.now().toString();
    const res = await request.post('/api/contact/', {
      data: {
        name: 'Test User',
        phone: '+201001234567',
        email: `test${unique}@example.com`,
        message: 'This is a test message from Playwright API test.',
      },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /api/contact with invalid data returns 400', async ({ request }) => {
    const res = await request.post('/api/contact/', {
      data: { name: '', phone: 'invalid', email: 'bad', message: '' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Booking API (public)', () => {
  test('POST /api/bookings with invalid phone returns 400', async ({ request }) => {
    const res = await request.post('/api/bookings/', {
      data: {
        name: 'Test',
        phone: '0100',
        model: 'Bajaj Pulsar',
        issue: 'Test issue description',
        date: '2099-12-31',
        time: '14:00',
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Protected API routes', () => {
  test('GET /api/products/ returns public list', async ({ request }) => {
    const res = await request.get('/api/products/');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data?.products)).toBe(true);
  });

  test('GET /api/bookings without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/bookings/');
    expect(res.status()).toBe(401);
  });

  test('GET /api/customers without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/customers/');
    expect(res.status()).toBe(401);
  });
});
