import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface TestTenant {
  id: string;
  slug: string;
  userId: string;
  username: string;
  request: APIRequestContext;
}

async function createTenant(slug: string, name: string): Promise<{ id: string; slug: string }> {
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });
  return tenant;
}

async function createUser(tenantId: string, username: string): Promise<{ id: string; username: string }> {
  const password = await bcrypt.hash('TenantTest123!', 12);
  const user = await prisma.user.create({
    data: {
      username,
      password,
      role: 'admin',
      tenantId,
    },
  });
  return { id: user.id, username: user.username };
}

async function login(request: APIRequestContext, username: string, password: string) {
  const res = await request.post('/api/auth/login/', {
    data: { username, password },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
}

test.describe('Tenant isolation', () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;
  let cleanupIds: { products: string[]; customers: string[]; users: string[]; tenants: string[] } = {
    products: [],
    customers: [],
    users: [],
    tenants: [],
  };

  test.beforeAll(async ({ request }) => {
    const ts = Date.now();
    const tA = await createTenant(`tenant-a-e2e-${ts}`, 'Tenant A E2E');
    const userA = await createUser(tA.id, `tenant_a_admin_e2e_${ts}`);
    const tB = await createTenant(`tenant-b-e2e-${ts}`, 'Tenant B E2E');
    const userB = await createUser(tB.id, `tenant_b_admin_e2e_${ts}`);

    cleanupIds.users.push(userA.id, userB.id);
    cleanupIds.tenants.push(tA.id, tB.id);

    // Use isolated APIRequestContexts so cookie jars never mix tokens.
    const requestA = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });
    const requestB = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' });

    await Promise.all([
      login(requestA, userA.username, 'TenantTest123!'),
      login(requestB, userB.username, 'TenantTest123!'),
    ]);

    tenantA = { id: tA.id, slug: tA.slug, userId: userA.id, username: userA.username, request: requestA };
    tenantB = { id: tB.id, slug: tB.slug, userId: userB.id, username: userB.username, request: requestB };
  });

  test.afterAll(async () => {
    await tenantA?.request?.dispose();
    await tenantB?.request?.dispose();
    await prisma.product.deleteMany({ where: { id: { in: cleanupIds.products } } });
    await prisma.customer.deleteMany({ where: { id: { in: cleanupIds.customers } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds.users } } });
    await prisma.tenant.deleteMany({ where: { id: { in: cleanupIds.tenants } } });
    await prisma.$disconnect();
  });

  test('customer list is scoped to the authenticated tenant', async () => {
    const createRes = await tenantA.request.post('/api/v1/customers/', {
      data: { name: 'Tenant A Customer', phone: '+201001234567' },
    });
    expect(createRes.ok()).toBeTruthy();
    const createBody = await createRes.json();
    const customerId = createBody.data.customer.id as string;
    cleanupIds.customers.push(customerId);

    const listResA = await tenantA.request.get('/api/v1/customers/');
    expect(listResA.ok()).toBeTruthy();
    const listBodyA = await listResA.json();
    const customerIdsA = listBodyA.data.customers.map((c: { id: string }) => c.id);
    expect(customerIdsA).toContain(customerId);

    // Tenant B should not see Tenant A's customer
    const listResB = await tenantB.request.get('/api/v1/customers/');
    expect(listResB.ok()).toBeTruthy();
    const listBodyB = await listResB.json();
    const customerIdsB = listBodyB.data.customers.map((c: { id: string }) => c.id);
    expect(customerIdsB).not.toContain(customerId);
  });

  test('product list is scoped to the authenticated tenant', async () => {
    const createRes = await tenantA.request.post('/api/v1/products/', {
      data: {
        name: 'Tenant A Product',
        price: 100,
        stock: 10,
        category: 'test',
        barcode: `tenant-a-${Date.now()}`,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createBody = await createRes.json();
    const productId = createBody.data.product.id as string;
    cleanupIds.products.push(productId);

    const listResA = await tenantA.request.get('/api/v1/products/?admin=true');
    expect(listResA.ok()).toBeTruthy();
    const listBodyA = await listResA.json();
    const productIdsA = listBodyA.data.products.map((p: { id: string }) => p.id);
    expect(productIdsA).toContain(productId);

    // Tenant B should not see Tenant A's product
    const listResB = await tenantB.request.get('/api/v1/products/?admin=true');
    expect(listResB.ok()).toBeTruthy();
    const listBodyB = await listResB.json();
    const productIdsB = listBodyB.data.products.map((p: { id: string }) => p.id);
    expect(productIdsB).not.toContain(productId);
  });

  test('direct id access cannot cross tenant boundaries', async () => {
    // Create a product directly in Tenant B via DB
    const otherProduct = await prisma.product.create({
      data: {
        name: 'Tenant B Secret Product',
        price: 999,
        stock: 1,
        category: 'test',
        barcode: `tenant-b-secret-${Date.now()}`,
        tenantId: tenantB.id,
      },
    });
    cleanupIds.products.push(otherProduct.id);

    // Tenant A tries to mutate it by id
    const patchRes = await tenantA.request.patch(`/api/v1/products/${otherProduct.id}/`, {
      data: { name: 'Hacked by Tenant A' },
    });
    expect(patchRes.status()).toBe(404);
  });
});
