/**
 * COMPREHENSIVE BUSINESS-LOGIC VERIFICATION — verify-all.ts
 *
 * Covers every API surface + business rule on the QA tenant, including
 * areas the older scripts never touched:
 *   auth/RBAC/lockout, tenant isolation across all entities,
 *   products/inventory/low-stock, suppliers, manufacturers, vehicle-models,
 *   vehicles, customers/export/timeline, bookings validation,
 *   work-orders + parts + labour + complete-and-pay,
 *   invoice business rules (overpay guard, returns, credit),
 *   purchase-orders + F-180 supplier payments,
 *   accounting (accounts, periods, trial balance, statements),
 *   reports, cashier, WhatsApp, barcode, contact, settings/features,
 *   inventory counts reconciliation, cron/upload/AI auth guards.
 *
 * Requires the QA tenant seeded by e2e/seed-qa.ts and the dev server on
 * http://localhost:3000 running with E2E_TEST=true.
 *
 * Usage: npx tsx e2e/verify-all.ts
 */

import { PrismaClient } from '@prisma/client';
import { CHART_OF_ACCOUNTS } from '../prisma/seed-accounts';

const BASE = 'http://localhost:3000';
const QA_TENANT_ID = 'qa-test-0000-0000-000000000001';
const ALT_TENANT_ID = 'alt-test-0000-0000-000000000002';

const raw = new PrismaClient();

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

let passCount = 0;
let failCount = 0;
const failures: string[] = [];
let adminCookies = '';

function ok(msg: string) { passCount++; console.log(`  ✅ ${msg}`); }
function fail(msg: string, d?: string) { failCount++; failures.push(`${msg}${d ? ` — ${d}` : ''}`); console.log(`  ❌ ${msg}${d ? `\n     ${d}` : ''}`); }
function info(msg: string) { console.log(`   · ${msg}`); }

function withSlash(p: string) {
  const [path, qs] = p.split('?');
  return `${path.endsWith('/') ? path : `${path}/`}${qs ? `?${qs}` : ''}`;
}

const TIMEOUT_MS = 45000;

async function api(method: string, path: string, body?: unknown, cookies?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookies ?? adminCookies) h['Cookie'] = cookies ?? adminCookies;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${withSlash(path)}`, {
      method, headers: h, body: body ? JSON.stringify(body) : undefined,
      redirect: 'follow', signal: ac.signal,
    });
    try { return { status: res.status, body: await res.json(), cookies: res.headers.get('set-cookie') || '' }; }
    catch { return { status: res.status, body: null, cookies: '' }; }
  } catch {
    return { status: 0, body: null, cookies: '' };
  } finally {
    clearTimeout(timer);
  }
}

async function doLogin(user: string, pw: string) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pw }),
      redirect: 'follow', signal: ac.signal,
    });
    // Login is rate-limited per-IP (5/min); the auth module issues several
    // rapid logins, so wait out Retry-After and retry rather than failing.
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') || '10');
      console.log(`   [retry] login rate-limited — waiting ${retryAfter}s`);
      await delay(retryAfter * 1000 + 500);
      return doLogin(user, pw);
    }
    const sc = res.headers.get('set-cookie') || '';
    const body = await res.json().catch(() => null);
    return { status: res.status, cookies: sc, body };
  } catch {
    return { status: 0, cookies: '', body: null };
  } finally {
    clearTimeout(timer);
  }
}

function pickId(body: unknown, ...paths: string[][]): string | undefined {  const d = (body as { data?: Record<string, unknown> })?.data;
  if (!d || typeof d !== 'object') return undefined;
  for (const p of paths) {
    let cur: unknown = d;
    for (const seg of p) {
      if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[seg];
      else { cur = undefined; break; }
    }
    if (cur && typeof cur === 'string') return cur;
  }
  return undefined;
}

const U = Date.now().toString(36);

async function seedQaAccounts() {
  for (const group of CHART_OF_ACCOUNTS) {
    const parent = await raw.account.upsert({
      where: { tenantId_code: { tenantId: QA_TENANT_ID, code: group.code } },
      update: { name: group.name, nameAr: group.nameAr, type: group.type },
      create: { code: group.code, name: group.name, nameAr: group.nameAr, type: group.type, tenantId: QA_TENANT_ID },
    });
    for (const child of (group.children || [])) {
      await raw.account.upsert({
        where: { tenantId_code: { tenantId: QA_TENANT_ID, code: child.code } },
        update: { name: child.name, nameAr: child.nameAr, type: child.type, parentId: parent.id },
        create: { code: child.code, name: child.name, nameAr: child.nameAr, type: child.type, parentId: parent.id, tenantId: QA_TENANT_ID },
      });
    }
  }
  info('Chart of Accounts upserted for QA tenant');
}

async function loginAsAdmin() {
  const r = await doLogin('qa-admin', 'Test@12345');
  if (r.status !== 200) { fail('M1 login qa-admin', `status ${r.status}`); process.exit(1); }
  adminCookies = r.cookies;
  ok('Admin session established');
}

// ── M1: Auth, RBAC, Lockout ─────────────────────────────────────────────
async function m1Auth() {
  console.log('\n=== M1: Auth / RBAC / Lockout ===\n');

  const me = await api('GET', '/api/auth/me');
  if (me.status === 200) ok('/me returns session');
  else fail('/me', `${me.status}`);

  const noAuth = await api('GET', '/api/v1/products/?admin=true', undefined, '');
  if (noAuth.status === 401) ok('No auth on admin products → 401');
  else fail('No auth on admin products', `${noAuth.status}`);
  const pubProds = await api('GET', '/api/v1/products/', undefined, '');
  if (pubProds.status === 200) ok('Public products catalog → 200');
  else fail('Public products catalog', `${pubProds.status}`);

  const bad = await doLogin('qa-admin', 'WrongPass1!');
  if (bad.status === 401) ok('Wrong password → 401');
  else fail('Wrong password', `${bad.status}`);

  const uniq = `${U}-lk`;
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('Lock@12345', 10);
  await raw.user.create({ data: { username: `qa-lock-${uniq}`, password: hash, role: 'admin', tenantId: QA_TENANT_ID } });
  const lockUser = `qa-lock-${uniq}`;
  let s1 = await doLogin(lockUser, 'Bad@1');
  let s2 = await doLogin(lockUser, 'Bad@2');
  let s3 = await doLogin(lockUser, 'Bad@3');
  if (s1.status === 401 && s2.status === 401) ok('Failed attempts 1-2 → 401');
  else fail('Failed attempt escalation', `${s1.status}/${s2.status}`);
  if (s3.status === 423) ok('3rd failed attempt → 423 (locked)');
  else fail('Lockout on 3rd attempt', `${s3.status}`);
  const s4 = await doLogin(lockUser, 'Lock@12345');
  if (s4.status === 423) ok('Correct password while locked → 423');
  else fail('Locked user with correct password', `${s4.status}`);
  await raw.user.update({ where: { username: lockUser }, data: { lockedUntil: null, failedAttempts: 0 } });
  const s5 = await doLogin(lockUser, 'Lock@12345');
  if (s5.status === 200) ok('After unlock → 200');
  else fail('After unlock login', `${s5.status}`);
  await raw.user.delete({ where: { username: lockUser } });

  const vh = await bcrypt.hash('View@12345', 10);
  const vName = `qa-viewx-${uniq}`;
  await raw.user.create({ data: { username: vName, password: vh, role: 'viewer', tenantId: QA_TENANT_ID } });
  const vLogin = await doLogin(vName, 'View@12345');
  if (vLogin.status !== 200) { fail('Viewer login', `${vLogin.status}`); }
  else {
    const vCk = vLogin.cookies;
    const vRead = await api('GET', '/api/v1/products/', undefined, vCk);
    const vWrite = await api('POST', '/api/v1/accounts/', { code: `X-${uniq}`, name: `X ${uniq}`, type: 'asset' }, vCk);
    if (vRead.status === 200) ok('Viewer can read products');
    else fail('Viewer read products', `${vRead.status}`);
    if (vWrite.status === 403) ok('Viewer cannot write accounts → 403');
    else fail('Viewer write accounts', `${vWrite.status}`);
  }
  await raw.user.delete({ where: { username: vName } });

  const lg = await api('POST', '/api/auth/logout');
  if (lg.status === 200) ok('Logout → 200');
  else fail('Logout', `${lg.status}`);
  await loginAsAdmin();
}

// ── M2: Tenant isolation across all entities ────────────────────────────
async function m2TenantIsolation() {
  console.log('\n=== M2: Tenant isolation across entities ===\n');
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash('Alt@12345', 10);
  await raw.tenant.upsert({ where: { slug: 'alt-test' }, update: {}, create: { id: ALT_TENANT_ID, name: 'Alt', slug: 'alt-test' } });
  await raw.user.upsert({ where: { username: 'alt-admin' }, update: {}, create: { username: 'alt-admin', password: hash, role: 'admin', tenantId: ALT_TENANT_ID } });

  const alt = await doLogin('alt-admin', 'Alt@12345');
  if (alt.status !== 200) { fail('Alt login', `${alt.status}`); return; }
  const ac = alt.cookies;

  const probes: Array<[string, string]> = [
    ['customers', 'data.customers'], ['vehicles', 'data.vehicles'],
    ['work-orders', 'data.workOrders'], ['invoices', 'data.invoices'], ['purchase-orders', 'data.purchaseOrders'],
    ['suppliers', 'data.suppliers'], ['bookings', 'data.bookings'], ['journal-entries', 'data.entries'],
    ['manufacturers', 'data.manufacturers'], ['vehicle-models', 'data.models'], ['accounts', 'data.accounts'],
  ];
  // Products list is a PUBLIC catalog by design (market page); tenant isolation
  // must be asserted on the admin-scoped view instead.
  const adminProds = await api('GET', '/api/v1/products/?admin=true&limit=100', undefined, ac);
  const apArr = (adminProds.body?.data?.products as unknown[]) ?? [];
  if (adminProds.status === 200 && apArr.length === 0) ok('products (admin view) isolated (0)');
  else fail('products (admin view) isolation', `status=${adminProds.status} count=${apArr.length}`);
  for (const [ep, pathStr] of probes) {
    const r = await api('GET', `/api/v1/${ep}/?limit=100`, undefined, ac);
    const arr = (() => {
      let cur: unknown = r.body;
      for (const seg of pathStr.split('.')) {
        if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[seg];
        else return undefined;
      }
      return Array.isArray(cur) ? cur : undefined;
    })();
    const count = arr ? arr.length : 0;
    if (r.status === 200 && count === 0) ok(`${ep} isolated (${count})`);
    else fail(`${ep} isolation`, `status=${r.status} count=${count}`);
  }
  await loginAsAdmin();
}

// ── M3: Products & inventory ────────────────────────────────────────────
async function m3Products() {
  console.log('\n=== M3: Products & inventory ===\n');

  const list = await api('GET', '/api/v1/products/?limit=100');
  const prods = (list.body?.data?.products as unknown[]) ?? [];
  if (list.status === 200 && prods.length > 0) ok(`Products list (${prods.length})`);
  else fail('Products list', `${list.status} count=${prods.length}`);

  const low = await api('GET', '/api/v1/products/low-stock/');
  if (low.status === 200) ok('Low-stock endpoint → 200');
  else fail('Low-stock endpoint', `${low.status}`);

  const name = `VA-P-${U}`;
  const created = await api('POST', '/api/v1/products/', { name, price: 123.45, stock: 7, category: 'Parts', unit: 'pcs', costPrice: 80, lowStockThreshold: 2, barcode: `VA${U}` });
  const pid = pickId(created.body, ['product', 'id'], ['id']);
  if (created.status === 201 && pid) ok(`Product created (${pid})`);
  else { fail('Product create', `${created.status}: ${JSON.stringify(created.body).slice(0, 160)}`); return; }

  const patch = await api('PATCH', `/api/v1/products/${pid}/`, { price: 150 });
  if (patch.status === 200) ok('Product PATCH → 200');
  else fail('Product PATCH', `${patch.status}`);

  const locked = await api('POST', '/api/v1/products/', { name: `VA-SVC-${U}`, price: 50, stock: 3, category: 'Service', lockInventory: true });
  const lp = pickId(locked.body, ['product', 'id'], ['id']);
  if (locked.status === 201 && lp) {
    const preStock = Number((await raw.product.findUnique({ where: { id: lp } }))?.stock ?? -1);
    const inv = await api('POST', '/api/v1/invoices/', { type: 'sale', items: [{ productId: lp, quantity: 1 }], paid: 50, paymentMethod: 'cash', customerId: null });
    const postStock = Number((await raw.product.findUnique({ where: { id: lp } }))?.stock ?? -1);
    if (inv.status === 201 && postStock === preStock) ok('lockInventory product: stock NOT deducted (service)');
    else fail('lockInventory product', `inv=${inv.status} stock ${preStock}→${postStock}`);
  } else fail('Product create (service)', `${locked.status}`);

  const del = await api('DELETE', `/api/v1/products/${pid}/`);
  if (del.status === 200) ok('Product soft DELETE → 200');
  else fail('Product DELETE', `${del.status}`);

  const exp = await api('GET', '/api/v1/products/export/');
  if (exp.status === 200) ok('Products export → 200');
  else fail('Products export', `${exp.status}`);
}

// ── M4-M8: Suppliers, Manufacturers, Vehicle Models, Vehicles, Customers ─
async function m4Suppliers() {
  console.log('\n=== M4: Suppliers ===\n');
  const r = await api('POST', '/api/v1/suppliers/', { name: `VA-SUP-${U}`, email: `sup${U}@x.com`, phone: '+201099999901' });
  const id = pickId(r.body, ['supplier', 'id'], ['id']);
  if (r.status === 201 && id) ok('Supplier created');
  else { fail('Supplier create', `${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`); return; }
  const patch = await api('PATCH', `/api/v1/suppliers/${id}/`, { name: `VA-SUP-${U}-2` });
  if (patch.status === 200) ok('Supplier PATCH → 200'); else fail('Supplier PATCH', `${patch.status}`);
  const get = await api('GET', `/api/v1/suppliers/${id}/`);
  if (get.status === 200) ok('Supplier GET [id] → 200'); else fail('Supplier GET [id]', `${get.status}`);
  const del = await api('DELETE', `/api/v1/suppliers/${id}/`);
  if (del.status === 200) ok('Supplier DELETE → 200'); else fail('Supplier DELETE', `${del.status}`);
}

async function m5Manufacturers() {
  console.log('\n=== M5: Manufacturers ===\n');
  const r = await api('POST', '/api/v1/manufacturers/', { name: `VA-MFG-${U}` });
  const id = pickId(r.body, ['manufacturer', 'id'], ['id']);
  if (r.status === 201 && id) ok('Manufacturer created');
  else { fail('Manufacturer create', `${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`); return; }
  const patch = await api('PATCH', `/api/v1/manufacturers/${id}/`, { name: `VA-MFG-${U}-2` });
  if (patch.status === 200) ok('Manufacturer PATCH → 200'); else fail('Manufacturer PATCH', `${patch.status}`);
  const del = await api('DELETE', `/api/v1/manufacturers/${id}/`);
  if (del.status === 200) ok('Manufacturer DELETE → 200'); else fail('Manufacturer DELETE', `${del.status}`);
}

async function m6VehicleModels() {
  console.log('\n=== M6: Vehicle models ===\n');
  const r = await api('POST', '/api/v1/vehicle-models/', { name: `VA-MOD-${U}`, make: 'Bajaj' });
  const id = pickId(r.body, ['model', 'id'], ['id']);
  if (r.status === 201 && id) ok('Vehicle model created');
  else { fail('Vehicle model create', `${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`); return; }
  const patch = await api('PATCH', `/api/v1/vehicle-models/${id}/`, { name: `VA-MOD-${U}-2` });
  if (patch.status === 200) ok('Vehicle model PATCH → 200'); else fail('Vehicle model PATCH', `${patch.status}`);
  const del = await api('DELETE', `/api/v1/vehicle-models/${id}/`);
  if (del.status === 200) ok('Vehicle model DELETE → 200'); else fail('Vehicle model DELETE', `${del.status}`);
}

async function m7Vehicles() {
  console.log('\n=== M7: Vehicles ===\n');
  const cust = await raw.customer.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false } });
  if (!cust) { fail('Vehicles', 'no customer'); return; }
  const r = await api('POST', '/api/v1/vehicles/', { customerId: cust.id, make: 'Bajaj', model: 'Pulsar', year: 2024, plateNumber: `VA${U}`, chassisNumber: `CH-${U}` });
  const id = pickId(r.body, ['vehicle', 'id'], ['id']);
  if (r.status === 201 && id) ok('Vehicle created');
  else { fail('Vehicle create', `${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`); return; }
  const patch = await api('PATCH', `/api/v1/vehicles/${id}/`, { year: 2025 });
  if (patch.status === 200) ok('Vehicle PATCH → 200'); else fail('Vehicle PATCH', `${patch.status}`);
  const del = await api('DELETE', `/api/v1/vehicles/${id}/`);
  if (del.status === 200) ok('Vehicle DELETE → 200'); else fail('Vehicle DELETE', `${del.status}`);
}

async function m8Customers() {
  console.log('\n=== M8: Customers + export + timeline ===\n');
  const ref = `VA-C-${U}`;
  const r = await api('POST', '/api/v1/customers/', { name: ref, email: `c${U}@x.com`, phone: '+201099999902' });
  const id = pickId(r.body, ['customer', 'id'], ['id']);
  if (r.status === 201 && id) ok('Customer created');
  else { fail('Customer create', `${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`); return; }
  const patch = await api('PATCH', `/api/v1/customers/${id}/`, { name: `${ref}-2` });
  if (patch.status === 200) ok('Customer PATCH → 200'); else fail('Customer PATCH', `${patch.status}`);
  const get = await api('GET', `/api/v1/customers/${id}/`);
  if (get.status === 200) ok('Customer GET [id] → 200'); else fail('Customer GET [id]', `${get.status}`);
  const tl = await api('GET', `/api/v1/customers/${id}/timeline/`);
  if (tl.status === 200) ok('Customer timeline → 200'); else fail('Customer timeline', `${tl.status}`);
  const exp = await api('GET', '/api/v1/customers/export/');
  if (exp.status === 200) ok('Customers export → 200'); else fail('Customers export', `${exp.status}`);
  const del = await api('DELETE', `/api/v1/customers/${id}/`);
  if (del.status === 200) ok('Customer DELETE → 200'); else fail('Customer DELETE', `${del.status}`);
}

// ── M9: Bookings validation ─────────────────────────────────────────────
async function m9Bookings() {
  console.log('\n=== M9: Bookings validation ===\n');
  const slotTimes = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  const d = new Date(); d.setDate(d.getDate() + 20 + (Date.now() % 10));
  if (d.getDay() === 5) d.setDate(d.getDate() + 1);
  const dateStr = d.toISOString().slice(0, 10);
  const time = slotTimes[Date.now() % slotTimes.length];

  const b = await api('POST', '/api/v1/bookings/', { name: 'MonaTest', phone: '+201099999903', model: 'Pulsar', issue: 'Test issue five', date: dateStr, time }, undefined);
  if (b.status === 201) ok('Public booking created');
  else { fail('Public booking create', `${b.status}: ${JSON.stringify(b.body).slice(0, 160)}`); }

  const dup = await api('POST', '/api/v1/bookings/', { name: 'MonaTestTwo', phone: '+201099999904', model: 'Pulsar', issue: 'Test issue five', date: dateStr, time }, undefined);
  if (dup.status === 409) ok('Double booking → 409');
  else fail('Double booking', `${dup.status}`);

  const friday = await api('POST', '/api/v1/bookings/', { name: 'x', phone: '+201099999905', model: 'x', issue: 'x', date: '2026-08-07', time: '12:00' }, undefined);
  if (friday.status === 400) ok('Friday booking → 400');
  else fail('Friday booking', `${friday.status}`);

  const past = await api('POST', '/api/v1/bookings/', { name: 'x', phone: '+201099999906', model: 'x', issue: 'x', date: '2020-01-01', time: '12:00' }, undefined);
  if (past.status === 400) ok('Past date booking → 400');
  else fail('Past booking', `${past.status}`);

  const badTime = await api('POST', '/api/v1/bookings/', { name: 'x', phone: '+201099999907', model: 'x', issue: 'x', date: dateStr, time: '03:00' }, undefined);
  if (badTime.status === 400) ok('Invalid time booking → 400');
  else fail('Invalid time', `${badTime.status}`);

  const list = await api('GET', '/api/v1/bookings/?limit=100');
  if (list.status === 200) ok('Admin bookings list → 200'); else fail('Bookings list', `${list.status}`);
}

// ── M10: Work orders pipeline ───────────────────────────────────────────
async function m10WorkOrders() {
  console.log('\n=== M10: Work orders ===\n');
  const veh = await raw.vehicle.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false } });
  const prod = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, lockInventory: false, category: { not: 'Service' } } });
  if (!veh || !prod) { fail('WO', 'no vehicle/product'); return; }

  const wo = await api('POST', '/api/v1/work-orders/', { description: `VA-WO-${U}`, status: 'in_progress', vehicleId: veh.id });
  const woId = pickId(wo.body, ['workOrder', 'id'], ['id']);
  if (wo.status === 201 && woId) ok('WO created');
  else { fail('WO create', `${wo.status}: ${JSON.stringify(wo.body).slice(0, 160)}`); return; }

  const preStock = Number(prod.stock);
  const pt = await api('POST', `/api/v1/work-orders/${woId}/parts/`, { productId: prod.id, quantity: 1 });
  if (pt.status === 201) ok('Part added');
  else { fail('WO part add', `${pt.status}`); return; }
  const postAdd = Number((await raw.product.findUnique({ where: { id: prod.id } }))?.stock ?? -1);
  if (postAdd === preStock) ok('Stock unchanged at part add');
  else fail('Stock at add', `${preStock}→${postAdd}`);

  const lb = await api('POST', `/api/v1/work-orders/${woId}/labour/`, { description: 'lab', hours: 1, rate: 100, total: 100 });
  if (lb.status === 201) ok('Labour added');
  else fail('WO labour add', `${lb.status}`);

  const parts = await raw.workOrderPart.findFirst({ where: { workOrderId: woId, isDeleted: false } });
  if (parts) {
    const pd = await api('DELETE', `/api/v1/work-orders/${woId}/parts/?partId=${parts.id}`);
    if (pd.status === 200) ok('Part DELETE → 200'); else fail('Part DELETE', `${pd.status}`);
  }
  const labs = await raw.workOrderLabour.findFirst({ where: { workOrderId: woId, isDeleted: false } });
  if (labs) {
    const ld = await api('DELETE', `/api/v1/work-orders/${woId}/labour/?labourId=${labs.id}`);
    if (ld.status === 200) ok('Labour DELETE → 200'); else fail('Labour DELETE', `${ld.status}`);
  }

  const ccp = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay/`, { paymentMethod: 'cash', amountPaid: 0 });
  if (ccp.status === 200) ok('Complete-and-pay → 200');
  else fail('Complete-and-pay', `${ccp.status}: ${JSON.stringify(ccp.body).slice(0, 160)}`);
}

// ── M11: Invoice business rules ─────────────────────────────────────────
async function m11Invoices() {
  console.log('\n=== M11: Invoice business rules ===\n');
  const prod = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, lockInventory: false, category: { not: 'Service' }, stock: { gte: 5 } } });
  if (!prod) { fail('Invoices', 'no product'); return; }
  const unit = Number(prod.price);

  // Overpayment is now allowed (payment may exceed total; change is returned).
  const effRate = prod.taxExempt ? 0 : prod.taxRate && Number(prod.taxRate) > 0 ? Number(prod.taxRate) : 14;
  const lineTotal = Math.round(unit * (1 + effRate / 100) * 100) / 100;
  const overpay = await api('POST', '/api/v1/invoices/', { type: 'sale', items: [{ productId: prod.id, quantity: 1 }], paid: lineTotal + 100, paymentMethod: 'cash', customerId: null });
  if (overpay.status === 201 && Math.round(Number(overpay.body?.data?.invoice?.change)) === 100) ok('Overpayment accepted, change returned');
  else fail('Overpayment handling', `${overpay.status}: ${JSON.stringify(overpay.body).slice(0, 160)}`);

  const preStock2 = Number((await raw.product.findUnique({ where: { id: prod.id } }))?.stock ?? -1);
  const sale = await api('POST', '/api/v1/invoices/', { type: 'sale', items: [{ productId: prod.id, quantity: 2 }], paid: unit * 2, paymentMethod: 'cash', customerId: null });
  const invId = pickId(sale.body, ['invoice', 'id'], ['id']);
  if (sale.status === 201 && invId) ok('Sale invoice created');
  else { fail('Sale invoice', `${sale.status}: ${JSON.stringify(sale.body).slice(0, 160)}`); return; }
  const postStock = Number((await raw.product.findUnique({ where: { id: prod.id } }))?.stock ?? -1);
  if (postStock === preStock2 - 2) ok('Stock decremented on sale');
  else fail('Stock after sale', `${preStock2}→${postStock}`);
  const je = await raw.journalEntry.findFirst({ where: { referenceId: invId } });
  if (je) {
    const lines = await raw.journalEntryLine.findMany({ where: { journalEntryId: je.id } });
    const dr = lines.reduce((s, l) => s + Number(l.debit), 0);
    const cr = lines.reduce((s, l) => s + Number(l.credit), 0);
    if (Math.abs(dr - cr) < 0.01) ok('Sale journal balanced');
    else fail('Sale journal balance', `DR=${dr} CR=${cr}`);
  } else fail('Sale journal', 'no entry');

  const ret = await api('POST', '/api/v1/invoices/', { type: 'return', items: [{ productId: prod.id, quantity: 1 }], paid: 0, paymentMethod: 'cash', returnInvoiceId: invId });
  if (ret.status === 201) ok('Return invoice created');
  else fail('Return invoice', `${ret.status}`);

  const dbl = await api('POST', '/api/v1/invoices/', { type: 'return', items: [{ productId: prod.id, quantity: 1 }], paid: 0, paymentMethod: 'cash', returnInvoiceId: invId });
  if (dbl.status !== 201) ok('Double return blocked');
  else fail('Double return', `${dbl.status}`);

  const cust = await raw.customer.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false } });
  if (cust) {
    // Credit sale = paid: 0 (system auto-creates AR). paymentMethod enum is cash/card/transfer.
    const credit = await api('POST', '/api/v1/invoices/', { type: 'sale', items: [{ productId: prod.id, quantity: 1 }], paid: 0, paymentMethod: 'cash', customerId: cust.id });
    const cInvId = pickId(credit.body, ['invoice', 'id'], ['id']);
    if (credit.status === 201) ok('Credit sale created (AR)');
    else fail('Credit sale', `${credit.status}: ${JSON.stringify(credit.body).slice(0, 200)}`);
    const cje = await raw.journalEntry.findFirst({ where: { referenceId: cInvId } });
    if (cje) {
      const clines = await raw.journalEntryLine.findMany({ where: { journalEntryId: cje.id }, include: { account: true } });
      const debitAR = clines.find(l => Number(l.debit) > 0)?.account;
      const creditRev = clines.find(l => Number(l.credit) > 0)?.account;
      if (clines.length >= 2 && debitAR?.type === 'asset' && creditRev?.type === 'revenue') ok('Credit journal: DR Asset(AR) + CR Revenue');
      else fail('Credit journal shape', `lines=${clines.length} debit=${debitAR?.type}/${debitAR?.code} credit=${creditRev?.type}/${creditRev?.code}`);
    } else fail('Credit journal', 'no entry');
  }
}

// ── M12: Purchase orders + F-180 supplier payments ──────────────────────
async function m12PurchaseOrders() {
  console.log('\n=== M12: Purchase orders + supplier payments (F-180) ===\n');
  const sup = await raw.supplier.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false } });
  const prod = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false } });
  if (!sup || !prod) { fail('PO', 'no supplier/product'); return; }
  const qty = 4;
  const up = Number(prod.price) * 0.5;
  const lineTotal = Math.round(up * qty * 100) / 100;
  const initStock = Number(prod.stock);

  const po = await api('POST', '/api/v1/purchase-orders/', { supplierId: sup.id, subtotal: lineTotal, total: lineTotal, items: [{ productId: prod.id, quantity: qty, unitPrice: up, total: lineTotal }] });
  const poId = pickId(po.body, ['order', 'id'], ['id']);
  const poItemId = (po.body?.data?.order?.items as Array<{ id: string }> | undefined)?.[0]?.id;
  if (po.status === 201 && poId) ok('PO created (draft)');
  else { fail('PO create', `${po.status}: ${JSON.stringify(po.body).slice(0, 160)}`); return; }

  const st = await api('PATCH', `/api/v1/purchase-orders/${poId}/status/`, { status: 'ordered' });
  if (st.status === 200) ok('PO → ordered'); else fail('PO ordered', `${st.status}`);

  const rc = await api('POST', `/api/v1/purchase-orders/${poId}/receive/`, { items: [{ orderItemId: poItemId, quantity: qty }] });
  if (rc.status === 201) ok('PO received (stock +4)');
  else fail('PO receive', `${rc.status}: ${JSON.stringify(rc.body).slice(0, 160)}`);
  const midStock = Number((await raw.product.findUnique({ where: { id: prod.id } }))?.stock ?? -1);
  if (midStock === initStock + qty) ok('Stock incremented by PO receive');
  else fail('Stock after receive', `${initStock}→${midStock}`);

  const pay = await api('POST', '/api/v1/supplier-payments/', { purchaseOrderId: poId, amount: lineTotal, paymentMethod: 'cash' });
  if (pay.status === 201) ok('Supplier payment created');
  else fail('Supplier payment', `${pay.status}: ${JSON.stringify(pay.body).slice(0, 160)}`);
  const poDb = await raw.purchaseOrder.findUnique({ where: { id: poId } });
  if (poDb && Number(poDb.paid) === lineTotal && poDb.paymentStatus === 'paid') ok('PO paid === total, paymentStatus=paid');
  else fail('PO payment status', `paid=${poDb?.paid} status=${poDb?.paymentStatus}`);

  const overpay = await api('POST', '/api/v1/supplier-payments/', { purchaseOrderId: poId, amount: 999999, paymentMethod: 'cash' });
  if (overpay.status === 400) ok('Supplier overpayment rejected');
  else fail('Supplier overpayment', `${overpay.status}`);

  const spList = await api('GET', '/api/v1/supplier-payments/');
  if (spList.status === 200) ok('Supplier payments list → 200'); else fail('Supplier payments list', `${spList.status}`);
}

// ── M13: Accounting ─────────────────────────────────────────────────────
async function m13Accounting() {
  console.log('\n=== M13: Accounting ===\n');

  const acc = await api('POST', '/api/v1/accounts/', { code: `5${U.slice(-5)}`, name: `VA-ACC-${U}`, type: 'expense' });
  const accId = pickId(acc.body, ['account', 'id'], ['id']);
  if (acc.status === 201 && accId) ok('Account created');
  else { fail('Account create', `${acc.status}: ${JSON.stringify(acc.body).slice(0, 160)}`); }
  if (accId) {
    const patch = await api('PATCH', `/api/v1/accounts/${accId}/`, { description: 'updated' });
    if (patch.status === 200) ok('Account PATCH → 200'); else fail('Account PATCH', `${patch.status}`);
  }

  const tb = await api('GET', '/api/v1/accounting/trial-balance/');
  if (tb.status === 200) {
    const rows = ((tb.body?.data as Record<string, unknown>)?.rows ?? (tb.body?.data as unknown[])) as Array<Record<string, unknown>>;
    const totDr = Number(((tb.body?.data as Record<string, unknown>)?.totalDebit ?? 0) ?? 0);
    const totCr = Number(((tb.body?.data as Record<string, unknown>)?.totalCredit ?? 0) ?? 0);
    if (Math.abs(totDr - totCr) < 0.01) ok('Trial balance DR = CR');
    else fail('Trial balance', `DR=${totDr} CR=${totCr}`);
  } else fail('Trial balance endpoint', `${tb.status}`);

  for (const ep of ['accounting/income-statement', 'accounting/balance-sheet', 'accounting/summary', 'accounting/transactions', 'accounting/treasury', 'accounting/periods', 'accounts', 'journal-entries']) {
    const r = await api('GET', `/api/v1/${ep}/`);
    if (r.status === 200) ok(`${ep} → 200`); else fail(`${ep}`, `${r.status}`);
  }

  const pMon = String(1 + (Date.now() % 12)).padStart(2, '0');
  const pDay = String(1 + (Math.floor(Date.now() / 1000) % 28)).padStart(2, '0');
  const pStart = `2027-${pMon}-${pDay}`; const pEnd = '2027-12-31';
  const per = await api('POST', '/api/v1/accounting/periods/', { name: `VA-PER-${U}`, startDate: pStart, endDate: pEnd });
  if (per.status === 201) ok('Accounting period created');
  else fail('Accounting period create', `${per.status}: ${JSON.stringify(per.body).slice(0, 160)}`);
  const dup = await api('POST', '/api/v1/accounting/periods/', { name: `VA-PER-${U}-d`, startDate: pStart, endDate: pEnd });
  if (dup.status === 409) ok('Duplicate period → 409');
  else fail('Duplicate period', `${dup.status}`);

  const je = await api('POST', '/api/v1/journal-entries/', { type: 'EXPENSE', amount: 10, description: `VA-JE-${U}` });
  if (je.status === 201) ok('Manual journal entry created (auto DR/CR)');
  else fail('Journal entry create', `${je.status}: ${JSON.stringify(je.body).slice(0, 160)}`);
}

// ── M14: Reports ────────────────────────────────────────────────────────
async function m14Reports() {
  console.log('\n=== M14: Reports ===\n');
  for (const ep of ['reports/financial', 'reports/inventory', 'reports/customers', 'reports/customers/smart']) {
    const r = await api('GET', `/api/v1/${ep}/`);
    if (r.status === 200) ok(`${ep} → 200`); else fail(`${ep}`, `${r.status}`);
  }
}

// ── M15: Cashier ────────────────────────────────────────────────────────
async function m15Cashier() {
  console.log('\n=== M15: Cashier ===\n');
  const g = await api('GET', '/api/v1/cashier/');
  if (g.status === 200) ok('Cashier GET → 200'); else fail('Cashier GET', `${g.status}`);
  const inc = await api('POST', '/api/v1/cashier/', { type: 'income', amount: 55, description: `VA-INC-${U}`, paymentMethod: 'cash', category: 'other' });
  if (inc.status === 201) ok('Cashier income → 201'); else fail('Cashier income', `${inc.status}: ${JSON.stringify(inc.body).slice(0, 160)}`);
  const exp = await api('POST', '/api/v1/cashier/', { type: 'expense', amount: 33, description: `VA-EXP-${U}`, paymentMethod: 'cash', category: 'other' });
  if (exp.status === 201) ok('Cashier expense → 201'); else fail('Cashier expense', `${exp.status}`);
}

// ── M16: WhatsApp ───────────────────────────────────────────────────────
async function m16WhatsApp() {
  console.log('\n=== M16: WhatsApp ===\n');
  for (const ep of ['whatsapp/status', 'whatsapp/settings', 'whatsapp/templates', 'whatsapp/reminder-schedules']) {
    const r = await api('GET', `/api/v1/${ep}/`);
    if (r.status === 200) ok(`${ep} → 200`); else fail(`${ep}`, `${r.status}`);
  }
}

// ── M17: Barcode ────────────────────────────────────────────────────────
async function m17Barcode() {
  console.log('\n=== M17: Barcode ===\n');
  const prod = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, barcode: { not: null } } });
  if (prod && prod.barcode) {
    const s = await api('POST', '/api/v1/barcode/', { barcode: prod.barcode, source: 'Webcam' });
    if (s.status === 200) ok(`Barcode scan → 200 (found ${prod.name})`);
    else fail('Barcode scan', `${s.status}: ${JSON.stringify(s.body).slice(0, 160)}`);
  } else {
    const s = await api('POST', '/api/v1/barcode/', { barcode: 'VA-NOPE-1', source: 'Webcam' });
    if (s.status === 200 || s.status === 404) ok(`Barcode scan unknown → ${s.status} (graceful)`);
    else fail('Barcode scan unknown', `${s.status}`);
  }
  const logs = await api('GET', '/api/v1/barcode/logs/');
  if (logs.status === 200) ok('Barcode logs → 200'); else fail('Barcode logs', `${logs.status}`);
}

// ── M18: Contact ────────────────────────────────────────────────────────
async function m18Contact() {
  console.log('\n=== M18: Contact ===\n');
  // Public form messages land in the DEFAULT tenant (route reads no auth context).
  const pub = await api('POST', '/api/v1/contact/', { name: `VA-CT-${U}`, email: `ct${U}@x.com`, phone: '+201099999908', message: `msg ${U}` }, undefined);
  if (pub.status === 201) ok('Contact message created (public → default tenant)');
  else { fail('Contact create', `${pub.status}: ${JSON.stringify(pub.body).slice(0, 160)}`); }

  // Same-tenant delete: seed a QA-tenant message via DB, then admin deletes it.
  const qaMsg = await raw.contactMessage.create({
    data: { name: `VA-CTQ-${U}`, phone: '+201099999909', email: `ctq${U}@x.com`, message: `qmsg ${U}`, tenantId: QA_TENANT_ID },
  });
  const list = await api('GET', '/api/v1/contact/?limit=100');
  const msgs = ((list.body?.data?.messages as Array<{ id?: string }>) ?? []);
  if (list.status === 200 && msgs.some((m) => m.id === qaMsg.id)) ok('Contact list contains QA message');
  else fail('Contact list', `${list.status} found=${msgs.length}`);
  const del = await api('DELETE', `/api/v1/contact/${qaMsg.id}/`);
  if (del.status === 200) ok('Contact DELETE (same tenant) → 200'); else fail('Contact DELETE', `${del.status}`);

  // Cross-tenant isolation: QA admin must NOT be able to delete default-tenant messages.
  const pubMsg = await raw.contactMessage.findFirst({ where: { tenantId: { not: QA_TENANT_ID }, isDeleted: false } });
  if (pubMsg) {
    const xd = await api('DELETE', `/api/v1/contact/${pubMsg.id}/`);
    if (xd.status === 404) ok('Cross-tenant delete → 404 (isolated)');
    else fail('Cross-tenant delete', `${xd.status}`);
  } else {
    info('No default-tenant message available for cross-tenant check');
  }
}

// ── M19: Settings, features, auth guards ────────────────────────────────
async function m19SettingsAndGuards() {
  console.log('\n=== M19: Settings / features / auth guards ===\n');
  const s = await api('GET', '/api/v1/settings/');
  if (s.status === 200) ok('Settings GET → 200'); else fail('Settings GET', `${s.status}`);
  const feats = await api('GET', '/api/v1/features/');
  if (feats.status === 200) ok('Features → 200'); else fail('Features', `${feats.status}`);
  const fc = await api('GET', '/api/v1/features/check/?key=customers');
  if (fc.status === 200) ok('Features/check → 200'); else fail('Features/check', `${fc.status}`);
  const fcMissing = await api('GET', '/api/v1/features/check/');
  if (fcMissing.status === 400) ok('Features/check missing key → 400'); else fail('Features/check missing key', `${fcMissing.status}`);

  const upload = await api('POST', '/api/v1/upload/', {}, '');
  if (upload.status === 401) ok('Upload no-auth → 401'); else fail('Upload guard', `${upload.status}`);
  const ai = await api('POST', '/api/v1/ai/describe/', {}, '');
  if (ai.status === 401) ok('AI describe no-auth → 401'); else fail('AI guard', `${ai.status}`);
  const cron = await api('GET', '/api/v1/cron/reminders/', undefined, '');
  if (cron.status === 401) ok('Cron reminders no-auth → 401'); else fail('Cron guard', `${cron.status}`);

  const gr = await api('GET', '/api/google-reviews/', undefined, '');
  if (gr.status === 200) ok('Google reviews (public) → 200'); else fail('Google reviews', `${gr.status}`);
  const scanLogs = await api('GET', '/api/v1/scan-logs/');
  if (scanLogs.status === 200) ok('Scan logs → 200'); else fail('Scan logs', `${scanLogs.status}`);
  const sm = await api('GET', '/api/v1/stock-movements/?limit=10');
  if (sm.status === 200) ok('Stock movements → 200'); else fail('Stock movements', `${sm.status}`);
}

// ── M20: Inventory counts reconciliation ────────────────────────────────
async function m20InventoryCounts() {
  console.log('\n=== M20: Inventory counts ===\n');
  const prod = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, lockInventory: false, category: { not: 'Service' } } });
  if (!prod) { fail('Inventory counts', 'no product'); return; }
  const realStock = Number(prod.stock);
  const newStock = realStock + 2;

  const c = await api('POST', '/api/v1/inventory-counts/', { name: `VA-COUNT-${U}` });
  const cId = pickId(c.body, ['count', 'id'], ['id']);
  if (c.status === 201 && cId) ok('Inventory count created');
  else { fail('Inventory count create', `${c.status}: ${JSON.stringify(c.body).slice(0, 160)}`); return; }

  // POST auto-creates a count item for every product — just update ours
  const upd = await api('PATCH', `/api/v1/inventory-counts/${cId}/`, { action: 'update_items', items: [{ productId: prod.id, actualQty: newStock, reason: 'VA test count' }] });
  if (upd.status === 200) ok('Inventory count items updated');
  else fail('Inventory count update', `${upd.status}: ${JSON.stringify(upd.body).slice(0, 160)}`);

  const done = await api('PATCH', `/api/v1/inventory-counts/${cId}/`, { action: 'complete', items: [] });
  if (done.status === 200) ok('Inventory count completed');
  else fail('Inventory count complete', `${done.status}: ${JSON.stringify(done.body).slice(0, 160)}`);

  const after = Number((await raw.product.findUnique({ where: { id: prod.id } }))?.stock ?? -1);
  if (after === newStock) ok('Stock reconciled to counted qty');
  else fail('Stock reconcile', `${realStock}→${after}, expected ${newStock}`);
}

// ── Run all ─────────────────────────────────────────────────────────────
async function main() {
  console.log('==============================================================');
  console.log('  COMPREHENSIVE BUSINESS-LOGIC VERIFICATION (verify-all)');
  console.log('==============================================================');

  await seedQaAccounts();
  await loginAsAdmin();
  await m1Auth();
  await m2TenantIsolation();
  await m3Products();
  await m4Suppliers();
  await m5Manufacturers();
  await m6VehicleModels();
  await m7Vehicles();
  await m8Customers();
  await m9Bookings();
  await m10WorkOrders();
  await m11Invoices();
  await m12PurchaseOrders();
  await m13Accounting();
  await m14Reports();
  await m15Cashier();
  await m16WhatsApp();
  await m17Barcode();
  await m18Contact();
  await m19SettingsAndGuards();
  await m20InventoryCounts();

  console.log('\n==============================================================');
  console.log(`  RESULTS: ${passCount} PASS, ${failCount} FAIL`);
  console.log('==============================================================');
  if (failures.length) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log(`  ❌ ${f}`);
  }
  await raw.$disconnect();
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('verify-all crashed:', e);
  console.log(`\n  RESULTS (partial): ${passCount} PASS, ${failCount} FAIL`);
  if (failures.length) for (const f of failures) console.log(`  ❌ ${f}`);
  process.exit(1);
});
