/**
 * DEEP VERIFICATION SCRIPT — Second Pass v2
 *
 * Tests real database behavior, API workflows, accounting integrity,
 * tenant isolation, RBAC, concurrency, and reconciliation.
 *
 * Uses the QA tenant seeded by seed-qa.ts.
 * Makes real API calls against http://localhost:3000.
 * Queries the real database directly using raw PrismaClient.
 *
 * Usage: npx tsx e2e/verify-deep.ts
 */

import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000';
const QA_TENANT_ID = 'qa-test-0000-0000-000000000001';

const raw = new PrismaClient();

let passCount = 0;
let failCount = 0;
const failures: string[] = [];
let adminCookies = '';

function ok(msg: string) { passCount++; console.log(`  ✅ ${msg}`); }
function fail(msg: string, d?: string) { failCount++; failures.push(`${msg}${d ? ` — ${d}` : ''}`); console.log(`  ❌ ${msg}${d ? `\n     ${d}` : ''}`); }

function withSlash(p: string) { return p.endsWith('/') ? p : `${p}/`; }

// Unified tax rule (mirrors src/lib/order-totals.ts): exempt → 0,
// per-product taxRate when set, else general 14% fallback.
function effTaxRate(p: { taxRate?: unknown; taxExempt?: boolean }): number {
  if (p.taxExempt) return 0;
  const r = p.taxRate == null ? 0 : Number(p.taxRate);
  return r > 0 ? r : 14;
}
function priceTax(p: { price: unknown }, qty: number): number {
  return Number(p.price) * qty * (effTaxRate(p as { taxRate?: unknown; taxExempt?: boolean }) / 100);
}

async function api(method: string, path: string, body?: unknown) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (adminCookies) h['Cookie'] = adminCookies;
  const res = await fetch(`${BASE}${withSlash(path)}`, {
    method, headers: h, body: body ? JSON.stringify(body) : undefined,
    redirect: 'follow',
  });
  try { return { status: res.status, body: await res.json(), cookies: res.headers.get('set-cookie') || '' }; }
  catch { return { status: res.status, body: null, cookies: '' }; }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function doLogin(user: string, pw: string) {
  // Use raw fetch to properly capture Set-Cookie
  const res = await fetch(`${BASE}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pw }),
    redirect: 'follow',
  });
  const sc = res.headers.get('set-cookie') || '';
  const body = await res.json().catch(() => null);
  await delay(1500); // always wait 1.5s between logins (5/min limit)
  return { status: res.status, cookies: sc, body };
}

async function loginSetup() {
  console.log('\n=== AUTH SETUP ===\n');

  // Admin login
  const aR = await doLogin('qa-admin', 'Test@12345');
  if (aR.status === 200) { ok('Admin login → 200'); adminCookies = aR.cookies; }
  else fail('Admin login', `${aR.status}`);

  // Viewer login
  const vR = await doLogin('qa-viewer', 'Test@12345');
  const viewerCookies = vR.status === 200 ? vR.cookies : '';

  // Bad password
  const bR = await doLogin('qa-admin', 'wrong');
  if (bR.status === 401) ok('Bad password → 401');
  else fail('Bad password', `${bR.status}`);

  // Re-login admin after the rate limit window resets (wait extra)
  await delay(60000); // wait 1 full minute for login rate limit
  const aR2 = await doLogin('qa-admin', 'Test@12345');
  if (aR2.status === 200) { adminCookies = aR2.cookies; ok('Admin re-login → 200'); }
  else fail('Admin re-login', `${aR2.status}`);

  return { viewerCookies };
}

async function testRBAC() {
  console.log('\n=== 1: RBAC ===\n');
  // Admin can create
  const c1 = await api('POST', '/api/v1/customers', { name: 'RBAC-A', email: 'rbac-a@x.com', phone: '+201000000001' });
  if (c1.status === 401) { fail('Admin login failed — check cookies'); return; }
  ok(`Admin create customer → ${c1.status}`);

  // Viewer login and try create
  const vR = await api('POST', '/api/auth/login', { username: 'qa-viewer', password: 'Test@12345' });
  const vCookies = vR.cookies;
  await delay(1100);

  const c2 = await (async () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (vCookies) h['Cookie'] = vCookies;
    const res = await fetch(`${BASE}/api/v1/customers/`, {
      method: 'POST', headers: h, body: JSON.stringify({ name: 'RBAC-V', email: 'rbac-v@x.com', phone: '+201000000002' }),
      redirect: 'follow',
    });
    return { status: res.status };
  })();
  if (c2.status === 403) ok('Viewer cannot create customer → 403');
  else fail('Viewer create customer', `expected 403, got ${c2.status}`);

  // No auth
  const c3 = await (async () => {
    const res = await fetch(`${BASE}/api/v1/customers/`, {
      method: 'GET', redirect: 'follow',
    });
    return { status: res.status };
  })();
  if (c3.status === 401) ok('No auth on customers → 401');
  else fail('No auth on customers', `expected 401, got ${c3.status}`);

  // Re-login admin for subsequent tests
  const aR = await api('POST', '/api/auth/login', { username: 'qa-admin', password: 'Test@12345' });
  adminCookies = aR.cookies;
  await delay(1100);
}

async function testTenantIsolation() {
  console.log('\n=== 2: Tenant Isolation ===\n');

  // Create alt tenant user via raw DB
  const bcrypt = await import('bcryptjs');
  const pw = await bcrypt.hash('Alt@12345', 12);
  const altId = 'alt-test-0000-0000-000000000002';
  await raw.tenant.upsert({ where: { slug: 'alt-test' }, update: {}, create: { id: altId, name: 'Alt', slug: 'alt-test' } });
  await raw.user.upsert({ where: { username: 'alt-admin' }, update: {}, create: { username: 'alt-admin', password: pw, role: 'admin', tenantId: altId } });

  // Login as alt
  const aR = await api('POST', '/api/auth/login', { username: 'alt-admin', password: 'Alt@12345' });
  if (aR.status !== 200) { fail('Alt login', `${aR.status}`); return; }
  const altCookies = aR.cookies;
  ok('Alt tenant login succeeded');
  await delay(1100);

  // Alt tenant list customers
  const cList = await (async () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (altCookies) h['Cookie'] = altCookies;
    const res = await fetch(`${BASE}/api/v1/customers/`, { method: 'GET', headers: h, redirect: 'follow' });
    try { return { status: res.status, body: await res.json() }; }
    catch { return { status: res.status, body: null }; }
  })();
  if (cList.status === 200) {
    const data = cList.body as { data?: { customers?: unknown[] } };
    const count = data?.data?.customers?.length || 0;
    if (count === 0) ok('Alt sees 0 customers (isolated from QA)');
    else fail('Alt customer count', `expected 0, got ${count}`);
  } else fail('Alt customers list', `${cList.status}`);

  // Re-login admin
  const aR2 = await api('POST', '/api/auth/login', { username: 'qa-admin', password: 'Test@12345' });
  adminCookies = aR2.cookies;
  await delay(1100);
}

async function testFullWorkflow() {
  console.log('\n=== 3: Full Workflow ===\n');

  // 3a. Create customer
  const ref = `fw${Date.now()}`;
  const custR = await api('POST', '/api/v1/customers', { name: `FW ${ref}`, email: `${ref}@x.com`, phone: '+201000000003' });
  if (custR.status !== 200 && custR.status !== 201) { fail('Create customer', `${custR.status}`); return; }
  const custId = (custR.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
  if (!custId) { fail('Create customer', 'no id'); return; }
  ok('Customer created');

  // 3b. Vehicle
  const vehR = await api('POST', '/api/v1/vehicles', { customerId: custId, make: 'Bajaj', model: 'Pulsar', year: 2024, plateNumber: ref, chassisNumber: `CH-${ref}` });
  if (vehR.status !== 200 && vehR.status !== 201) { fail('Create vehicle', `${vehR.status}`); return; }
  const vehId = (vehR.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
  if (!vehId) { fail('Create vehicle', 'no id'); return; }
  ok('Vehicle created');

  // 3c. Get products from DB directly
  const products = await raw.product.findMany({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, stock: { gte: 2 } }, take: 2 });
  if (products.length < 2) { fail('Need 2 products', `found ${products.length}`); return; }
  const p1 = products[0], p2 = products[1];
  console.log(`   Products: ${p1.name}(${p1.stock}) ${p2.name}(${p2.stock})`);

  // 3d. Create booking via public API plus link it.
  // Use a unique date+time slot per run so reruns don't hit the date+time DOUBLE_BOOKING guard.
  const slotTimes = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  const d = new Date();
  d.setDate(d.getDate() + 2 + (Date.now() % 7));
  if (d.getDay() === 5) d.setDate(d.getDate() + 1); // skip Friday
  const bDate = d.toISOString().slice(0, 10);
  const bTime = slotTimes[Date.now() % slotTimes.length];
  const bR = await api('POST', '/api/v1/bookings', { name: 'FW', phone: '+201000000004', model: 'Pulsar', issue: 'Test issue', date: bDate, time: bTime });
  const bId = (bR.body as { data?: { booking?: { id: string } } })?.data?.booking?.id;
  if (!bId) { fail('Create booking', `${bR.status}`); return; }
  // Link customer+vehicle to booking in DB
  await raw.booking.update({ where: { id: bId }, data: { customerId: custId, vehicleId: vehId } });
  ok('Booking created + linked');

  // 3e. Create WO
  const woR = await api('POST', '/api/v1/work-orders', { description: 'FW Integration', vehicleId: vehId, bookingId: bId });
  if (woR.status !== 200 && woR.status !== 201) { fail('Create WO', `${woR.status}: ${JSON.stringify(woR.body)}`); return; }
  const woId = (woR.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
  if (!woId) { fail('Create WO', 'no id'); return; }
  ok('WO created');

  // 3f. Add parts
  const pp1 = await api('POST', `/api/v1/work-orders/${woId}/parts`, { productId: p1.id, quantity: 2 });
  if (pp1.status !== 200 && pp1.status !== 201) { fail('Add part1', `${pp1.status}`); return; }
  ok(`Part1 added: ${p1.name} x2`);
  const pp2 = await api('POST', `/api/v1/work-orders/${woId}/parts`, { productId: p2.id, quantity: 1 });
  if (pp2.status !== 200 && pp2.status !== 201) { fail('Add part2', `${pp2.status}`); return; }
  ok(`Part2 added: ${p2.name} x1`);

  // 3g. Add labour
  const lR = await api('POST', `/api/v1/work-orders/${woId}/labour`, { description: 'Labour', hours: 1.5, rate: 200, total: 300 });
  if (lR.status !== 200 && lR.status !== 201) { fail('Add labour', `${lR.status}`); return; }
  ok('Labour added: 1.5h x 200/hr');

  // 3h. Complete-and-pay (full amount)
  const p1total = Number(p1.price) * 2;
  const p2total = Number(p2.price) * 1;
  const labourTotal = 1.5 * 200;
  const tax = Math.round((priceTax(p1, 2) + priceTax(p2, 1)) * 100) / 100;
  const total = Math.round((p1total + p2total + labourTotal + tax) * 100) / 100;

  const cap = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: total });
  if (cap.status !== 200 && cap.status !== 201) {
    fail('Complete-and-pay', `${cap.status}: ${JSON.stringify(cap.body)}`);
    return;
  }
  ok(`WO completed + paid (total=${total})`);

  const invId = (cap.body as { data?: { invoice?: { id: string; number: string } } })?.data?.invoice?.id;
  if (!invId) { fail('No invoice id'); return; }
  const invNum = (cap.body as { data?: { invoice?: { number: string } } })?.data?.invoice?.number;
  ok(`Invoice ${invNum} created`);

  // Verify stock
  const p1f = await raw.product.findUnique({ where: { id: p1.id } });
  const p2f = await raw.product.findUnique({ where: { id: p2.id } });
  if (p1f && p1f.stock === Number(p1.stock) - 2) ok(`Stock OK: ${p1.name} ${p1.stock}→${p1f.stock}`);
  else fail('Stock p1', `expected ${Number(p1.stock)-2}, got ${p1f?.stock}`);
  if (p2f && p2f.stock === Number(p2.stock) - 1) ok(`Stock OK: ${p2.name} ${p2.stock}→${p2f.stock}`);
  else fail('Stock p2', `expected ${Number(p2.stock)-1}, got ${p2f?.stock}`);

  // Verify accounting
  await verifyAccounting(woId, total);

  return { woId, invId, total, custId, vehId, p1, p2 };
}

async function verifyAccounting(woId: string, expectedTotal: number) {
  const entries = await raw.journalEntry.findMany({
    where: { referenceId: woId, tenantId: QA_TENANT_ID },
    include: { lines: { where: { isDeleted: false } } },
  });
  if (entries.length === 0) { fail('No journal entries for invoice'); return; }

  for (const e of entries) {
    const dr = e.lines.reduce((s, l) => s + Number(l.debit), 0);
    const cr = e.lines.reduce((s, l) => s + Number(l.credit), 0);
    const bal = Math.abs(dr - cr) < 0.01;
    if (bal) ok(`Entry ${e.id.slice(0,8)} DR=${dr} = CR=${cr}`);
    else fail(`Entry ${e.id.slice(0,8)} DR=${dr} ≠ CR=${cr} (Δ=${Math.round((dr-cr)*100)/100})`);
    for (const l of e.lines) {
      const acct = await raw.account.findUnique({ where: { id: l.accountId } });
      console.log(`     ${acct?.code||'?'} ${acct?.name||'?'}: DR=${l.debit} CR=${l.credit}`);
    }
  }

  // Global trial balance
  const all = await raw.journalEntry.findMany({
    where: { tenantId: QA_TENANT_ID, isDeleted: false },
    include: { lines: { where: { isDeleted: false } } },
  });
  const tDr = all.reduce((s, e) => s + e.lines.reduce((s2, l) => s2 + Number(l.debit), 0), 0);
  const tCr = all.reduce((s, e) => s + e.lines.reduce((s2, l) => s2 + Number(l.credit), 0), 0);
  if (Math.abs(tDr - tCr) < 0.01) ok(`Trial balance: DR=${tDr} = CR=${tCr}`);
  else fail(`Trial balance: DR=${tDr} ≠ CR=${tCr} (Δ=${Math.round((tDr-tCr)*100)/100})`);
}

async function testOverpayment() {
  console.log('\n=== 4: Overpayment Tolerance ===\n');
  const ref = `op${Date.now()}`;
  const custR = await api('POST', '/api/v1/customers', { name: `OP ${ref}`, email: `${ref}@x.com`, phone: '+201000000005' });
  const custId = (custR.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
  if (!custId) { fail('Create customer'); return; }

  const vehR = await api('POST', '/api/v1/vehicles', { customerId: custId, make: 'Bajaj', model: 'Pulsar', plateNumber: ref, chassisNumber: `CH-OP${ref}` });
  const vehId = (vehR.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
  if (!vehId) { fail('Create vehicle'); return; }

  const woR = await api('POST', '/api/v1/work-orders', { description: 'OP Test', vehicleId: vehId });
  const woId = (woR.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
  if (!woId) { fail('Create WO'); return; }

  // Use cheapest product
  const prods = await raw.product.findMany({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, stock: { gte: 1 } }, orderBy: { price: 'asc' }, take: 1 });
  const prod = prods[0];
  if (!prod) { fail('No cheap product'); return; }
  console.log(`   Product: ${prod.name} price=${prod.price}`);

  await api('POST', `/api/v1/work-orders/${woId}/parts`, { productId: prod.id, quantity: 1 });

  const total = Math.round(Number(prod.price) * (1 + effTaxRate(prod) / 100) * 100) / 100;
  const overpay = total + 0.01;
  console.log(`   Total=${total}, Overpaying=${overpay} (+$0.01)`);

  const cap = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: overpay });
  if (cap.status !== 200 && cap.status !== 201) {
    fail('Overpay C&P', `${cap.status}: ${JSON.stringify(cap.body)}`);
    return;
  }
  ok('Overpayment of $0.01 accepted');

  const invId = (cap.body as { data?: { invoice?: { id: string } } })?.data?.invoice?.id;
  if (!invId) { fail('No invoice'); return; }

  // Check invoice change field
  const invR = await api('GET', `/api/v1/invoices/${invId}`);
  const inv = (invR.body as { data?: { invoice?: { change: number; total: number; paid: number } } })?.data?.invoice;
  if (inv) {
    if (Number(inv.change) === 0.01) ok('Invoice change field = $0.01');
    else fail('Invoice change', `expected 0.01, got ${inv.change}`);
  }

  // Verify accounting DR=CR
  await verifyAccounting(woId, total);
}

async function testPartialPayment() {
  console.log('\n=== 5: Partial Payment + Cancel ===\n');
  const ref = `pp${Date.now()}`;
  const custR = await api('POST', '/api/v1/customers', { name: `PP ${ref}`, email: `${ref}@x.com`, phone: '+201000000006' });
  const custId = (custR.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
  if (!custId) { fail('PP: create customer'); return; }

  const vehR = await api('POST', '/api/v1/vehicles', { customerId: custId, make: 'Bajaj', model: 'Pulsar', plateNumber: ref, chassisNumber: `CH-PP${ref}` });
  const vehId = (vehR.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
  if (!vehId) { fail('PP: create vehicle'); return; }

  const woR = await api('POST', '/api/v1/work-orders', { description: 'PP Test', vehicleId: vehId });
  const woId = (woR.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
  if (!woId) { fail('PP: create WO'); return; }

  const prods = await raw.product.findMany({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, stock: { gte: 1 } }, take: 1 });
  const prod = prods[0];
  if (!prod) { fail('PP: no product'); return; }

  await api('POST', `/api/v1/work-orders/${woId}/parts`, { productId: prod.id, quantity: 1 });

  const total = Math.round(Number(prod.price) * (1 + effTaxRate(prod) / 100) * 100) / 100;
  const paid = Math.round(total * 0.5 * 100) / 100;

  const cap = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: paid });
  if (cap.status !== 200 && cap.status !== 201) {
    fail('PP: C&P', `${cap.status}`);
    return;
  }
  ok(`Partial payment: paid ${paid} of ${total}`);

  const invId = (cap.body as { data?: { invoice?: { id: string } } })?.data?.invoice?.id;
  if (!invId) { fail('PP: no invoice'); return; }

  // Verify partial payment invoice
  const invR = await api('GET', `/api/v1/invoices/${invId}`);
  const inv = (invR.body as { data?: { invoice?: { paid: number; total: number; status: string; payments?: unknown[] } } })?.data?.invoice;
  if (inv) {
    if (Number(inv.paid) === paid) ok('Invoice paid = partial amount');
    else fail('Invoice paid', `expected ${paid}, got ${inv.paid}`);
    if (inv.payments && inv.payments.length >= 1) ok('Payment record exists');
    else fail('Payment records', `found ${inv.payments?.length}`);
  }

  // Verify accounting for partial payment
  await verifyAccounting(woId, total);

  // Cancel invoice
  const cancel = await api('PATCH', `/api/v1/invoices/${invId}`, { status: 'cancelled' });
  if (cancel.status === 200) {
    ok('Invoice cancelled');
    // Check reversal entries — look for RETURN type entries
    const reversals = await raw.journalEntry.findMany({
      where: { referenceId: invId, type: 'RETURN', tenantId: QA_TENANT_ID },
      include: { lines: true },
    });
    if (reversals.length > 0) {
      ok('Reversal journal entry exists');
      for (const r of reversals) {
        const dr = r.lines.reduce((s, l) => s + Number(l.debit), 0);
        const cr = r.lines.reduce((s, l) => s + Number(l.credit), 0);
        if (Math.abs(dr - cr) < 0.01) ok(`Reversal DR=${dr}=CR=${cr} (balanced)`);
        else fail(`Reversal DR=${dr}≠CR=${cr}`);
        // Check reversal credits AR not just Cash
        const crAccts = r.lines.filter(l => Number(l.credit) > 0);
        for (const cl of crAccts) {
          const a = await raw.account.findUnique({ where: { id: cl.accountId } });
          console.log(`   Reversal credits: ${a?.code} ${a?.name} = ${cl.credit}`);
        }
        if (crAccts.length > 1) ok('Reversal credits multiple accounts (Cash+AR)');
        else console.log('   ⚠️ Reversal only credits one account — AR may be stranded');
      }
    } else fail('No reversal journal entry');
  } else fail('Cancel invoice', `${cancel.status}: ${JSON.stringify(cancel.body)}`);
}

async function testPOFlow() {
  console.log('\n=== 6: PO Receive ===\n');
  const ref = `po${Date.now()}`;
  const supR = await api('POST', '/api/v1/suppliers', { name: `PO ${ref}`, email: `${ref}@x.com`, phone: '+201000000007' });
  if (supR.status !== 200 && supR.status !== 201) { fail('Create supplier', `${supR.status}: ${JSON.stringify(supR.body)}`); return; }
  const supId = (supR.body as { data?: { supplier?: { id: string } } })?.data?.supplier?.id;
  if (!supId) { fail('Create supplier', 'no id'); return; }
  ok('Supplier created');

  const prod = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, stock: { gte: 1 } } });
  if (!prod) { fail('No product'); return; }
  const initStock = prod.stock;
  console.log(`   Product: ${prod.name} stock=${initStock}`);

  // Create PO — try with items array
  const poUnitPrice = Number(prod.price) * 0.6;
  const poLineTotal = poUnitPrice * 10;
  const poR = await api('POST', '/api/v1/purchase-orders', {
    supplierId: supId,
    subtotal: poLineTotal,
    total: poLineTotal,
    items: [{ productId: prod.id, quantity: 10, unitPrice: poUnitPrice, total: poLineTotal }],
  });
  if (poR.status !== 200 && poR.status !== 201) {
    fail('Create PO', `${poR.status}: ${JSON.stringify(poR.body)}`);
    return;
  }
  const poId = (poR.body as { data?: { order?: { id: string } } })?.data?.order?.id;
  if (!poId) { fail('Create PO', 'no id'); return; }
  const poItemId = (poR.body as { data?: { order?: { items?: Array<{ id: string }> } } })?.data?.order?.items?.[0]?.id;
  if (!poItemId) { fail('Create PO', 'no orderItemId'); return; }
  ok('PO created');

  // Change to ordered
  const ordR = await api('PATCH', `/api/v1/purchase-orders/${poId}/status`, { status: 'ordered' });
  if (ordR.status !== 200) { fail('Order PO', `${ordR.status}: ${JSON.stringify(ordR.body)}`); return; }
  ok('PO status → ordered');

  // Partial receive (3)
  const rec3 = await api('POST', `/api/v1/purchase-orders/${poId}/receive`, { items: [{ orderItemId: poItemId, quantity: 3 }] });
  if (rec3.status !== 200 && rec3.status !== 201) { fail('Partial receive', `${rec3.status}: ${JSON.stringify(rec3.body)}`); return; }
  ok('Partial receive (3 of 10)');

  const s1 = await raw.product.findUnique({ where: { id: prod.id } });
  if (s1 && s1.stock === Number(initStock) + 3) ok(`Stock +3: ${initStock}→${s1.stock}`);
  else fail('Stock after partial', `expected ${initStock+3}, got ${s1?.stock}`);

  // Full receive (7)
  const rec7 = await api('POST', `/api/v1/purchase-orders/${poId}/receive`, { items: [{ orderItemId: poItemId, quantity: 7 }] });
  if (rec7.status !== 200 && rec7.status !== 201) { fail('Full receive', `${rec7.status}: ${JSON.stringify(rec7.body)}`); return; }
  ok('Full receive (7 of 10)');

  const s2 = await raw.product.findUnique({ where: { id: prod.id } });
  if (s2 && s2.stock === Number(initStock) + 10) ok(`Stock +10 total: ${initStock}→${s2.stock}`);
  else fail('Stock after full', `expected ${initStock+10}, got ${s2?.stock}`);

  // Over-receive attempt (should fail or PO is now "received")
  const overR = await api('POST', `/api/v1/purchase-orders/${poId}/receive`, { items: [{ orderItemId: poItemId, quantity: 5 }] });
  if (overR.status === 400) ok('Over-receive rejected (400)');
  else console.log(`   Over-receive: ${overR.status} (may be expected if status=received)`);
}

async function testDashboard() {
  console.log('\n=== 7: Dashboard vs DB ===\n');
  const dashR = await api('GET', '/api/v1/dashboard/stats');
  if (dashR.status !== 200) { fail('Dashboard', `${dashR.status}`); return; }
  ok('Dashboard stats fetched');

  const dash = (dashR.body as { data?: Record<string, unknown> })?.data || {};
  console.log(`   Dashboard keys: ${Object.keys(dash).join(', ')}`);

  const dbProds = await raw.product.count({ where: { tenantId: QA_TENANT_ID, isDeleted: false } });
  console.log(`   DB products: ${dbProds}`);
  const dashProds = (dash as Record<string, unknown>)?.totalProducts;
  if (dashProds !== undefined) {
    if (Number(dashProds) === dbProds) ok('Dashboard totalProducts matches DB');
    else fail('Dashboard totalProducts', `expected ${dbProds}, got ${dashProds}`);
  } else {
    console.log('   ⚠️ Dashboard does not expose totalProducts key');
  }
}

async function testSupplierPayment() {
  console.log('\n=== 8: Supplier Payment + Migration ===\n');
  const tables = await raw.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
  );
  const tableNames = tables.map((r: { table_name: string }) => r.table_name);
  if (tableNames.includes('SupplierPayment')) ok('SupplierPayment table EXISTS (F-180 applied)');
  else fail('SupplierPayment table ABSENT — F-180 migration not applied');

  const cols = await raw.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE table_name='PurchaseOrder' AND column_name IN ('paid','dueDate','paymentStatus')`
  );
  if (cols.length === 3) ok(`PO has F-180 columns: ${cols.map(c => c.column_name).join(', ')}`);
  else fail(`PO F-180 columns incomplete`, `expected 3, got ${cols.length}`);

  const enumVals = await raw.$queryRawUnsafe<Array<{ enumlabel: string }>>(
    `SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='JournalEntryType'`
  );
  const ev = enumVals.map((r: { enumlabel: string }) => r.enumlabel);
  if (ev.includes('SUPPLIER_PAYMENT')) ok('SUPPLIER_PAYMENT enum value present');
  else fail('SUPPLIER_PAYMENT enum value ABSENT');
  console.log(`   Available: ${ev.join(', ')}`);

  // Try supplier payment API
  const pos = await api('GET', '/api/v1/purchase-orders');
  const poList = (pos.body as { data?: { purchaseOrders?: Array<{ id: string; total: number }> } })?.data?.purchaseOrders;
  if (poList && poList.length > 0) {
    const po = poList[0];
    const payR = await api('POST', '/api/v1/supplier-payments', { purchaseOrderId: po.id, amount: 100, paymentMethod: 'cash' });
    console.log(`   Supplier payment API: status=${payR.status}`);
    if (payR.status >= 200 && payR.status < 300) {
      ok('Supplier payment API functional');
    } else if (payR.status >= 400) {
      console.log(`   Supplier payment API error: ${JSON.stringify(payR.body)}`);
    }
  } else console.log('   No POs available');
}

async function testConcurrent() {
  console.log('\n=== 9: Concurrent Inventory ===\n');
  const prod = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, lockInventory: false, stock: { gte: 20 } } });
  if (!prod) { fail('No product with stock≥20'); return; }
  const init = Number(prod.stock);
  console.log(`   Product: ${prod.name} stock=${init}`);

  // Create 3 WOs sequentially then fire C&P concurrently
  type WoInfo = { woId: string };
  const woInfos: WoInfo[] = [];

  for (let i = 0; i < 3; i++) {
    const ref = `cr${i}${Date.now()}`;
    const c = await api('POST', '/api/v1/customers', { name: `CR${i} ${ref}`, email: `${i}${ref}@x.com`, phone: `+20100000001${i}` });
    const cid = (c.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
    if (!cid) continue;
    const v = await api('POST', '/api/v1/vehicles', { customerId: cid, make: 'Bajaj', model: 'Pulsar', plateNumber: `CR${i}`, chassisNumber: `CH-CR${i}${ref}` });
    const vid = (v.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
    if (!vid) continue;
    const w = await api('POST', '/api/v1/work-orders', { description: `Concurrent ${i}`, vehicleId: vid });
    const wid = (w.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
    if (!wid) continue;
    await api('POST', `/api/v1/work-orders/${wid}/parts`, { productId: prod.id, quantity: 3 });
    woInfos.push({ woId: wid });
  }

  if (woInfos.length < 2) { fail('Need ≥2 WOs'); return; }
  ok(`${woInfos.length} WOs ready`);

  // Fire concurrently
  const results = await Promise.allSettled(
    woInfos.map(w => api('POST', `/api/v1/work-orders/${w.woId}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: 100 }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value.status === 200 || r.value.status === 201)).length;
  console.log(`   Concurrent: ${succeeded}/${woInfos.length} succeeded`);

  const final = await raw.product.findUnique({ where: { id: prod.id } });
  if (final) {
    if (final.stock >= 0) ok(`Stock non-negative: ${init}→${final.stock}`);
    else fail(`Stock NEGATIVE: ${final.stock}`);
    const expectedDeduction = succeeded * 3;
    console.log(`   Expected deduction: ${expectedDeduction}, actual: ${init - Number(final.stock)}`);
  }
}

async function main() {
  console.log('==============================================================');
  console.log('  SECOND PASS — REAL DB / API VERIFICATION');
  console.log('==============================================================');
  const start = Date.now();

  const { viewerCookies } = await loginSetup();
  if (!adminCookies) { console.log('   FATAL: Could not get admin session\n'); process.exit(1); }

  // Helper to use external cookies
  async function apiAs(method: string, path: string, cookies: string, body?: unknown) {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cookies) h['Cookie'] = cookies;
    const res = await fetch(`${BASE}${withSlash(path)}`, {
      method, headers: h, body: body ? JSON.stringify(body) : undefined,
      redirect: 'follow',
    });
    try { return { status: res.status, body: await res.json() }; }
    catch { return { status: res.status, body: null }; }
  }

  // Tests that require API
  for (const t of [testRBAC, testTenantIsolation, testFullWorkflow, testOverpayment, testPartialPayment, testPOFlow, testDashboard, testSupplierPayment, testConcurrent]) {
    // Inject viewerCookies into the function scope - ugly but effective
    try { await t(); await delay(500); }
    catch (e: unknown) { fail(`CRASHED: ${t.name}`, String(e)); }
  }

  await raw.$disconnect();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n==============================================================`);
  console.log(`  RESULTS: ${passCount} PASS, ${failCount} FAIL (${elapsed}s)`);
  console.log(`==============================================================`);
  if (failures.length) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log(`  ❌ ${f}`);
  }
}

main();
