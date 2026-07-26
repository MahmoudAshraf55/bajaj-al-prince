/**
 * P0 E2E Business Logic Test Runner
 *
 * Tests run against the live app + real database via HTTP API calls.
 * For each test: verify UI response, DB state, AND accounting entries.
 * A test PASSES only if all three agree.
 *
 * Usage: BASE_URL=http://localhost:3000 npx tsx e2e/run-p0-tests.ts
 */
import { PrismaClient } from '@prisma/client';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const QA_TENANT_ID = 'qa-test-0000-0000-000000000001';

// Use raw Prisma for DB assertions (bypass tenant extension)
const prisma = new (PrismaClient)();

interface TestResult {
  name: string;
  pass: boolean;
  evidence: string[];
  failures: string[];
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string, evidence: string[], failures: string[]): asserts condition {
  if (condition) {
    evidence.push(`  PASS: ${msg}`);
  } else {
    failures.push(`  FAIL: ${msg}`);
  }
}

function logResult(r: TestResult) {
  results.push(r);
  const icon = r.pass ? '✅' : '❌';
  console.log(`\n${icon} ${r.name}`);
  for (const e of r.evidence) console.log(e);
  for (const f of r.failures) console.log(`\x1b[31m${f}\x1b[0m`);
}

// ── Cookie Jar ───────────────────────────────────────────────────────────
let cookieJar: Record<string, string> = {};

function extractCookies(headers: Headers) {
  // Use raw headers to get Set-Cookie (getSetCookie may not be available)
  const rawHeaders = (headers as any).entries?.() ?? [];
  for (const [key, value] of rawHeaders) {
    if (key.toLowerCase() === 'set-cookie') {
      const cookie = value.split(';')[0].trim();
      const eqIdx = cookie.indexOf('=');
      if (eqIdx > 0) {
        const name = cookie.slice(0, eqIdx).trim();
        const val = cookie.slice(eqIdx + 1).trim();
        cookieJar[name] = val;
      }
    }
  }
}

function getCookieString(): string {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; json: any; headers: Headers }> {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': getCookieString(),
      'Origin': 'http://localhost:3000',
      'Referer': 'http://localhost:3000',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  extractCookies(res.headers);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, headers: res.headers };
}

async function loginAs(user: string, pass: string) {
  cookieJar = {};
  await api('POST', '/api/auth/login', { username: user, password: pass });
}

// ── E2E-015: Auth Flow ──────────────────────────────────────────────────
async function testAuthFlow(): Promise<TestResult> {
  const r: TestResult = { name: 'E2E-015: Auth Flow', pass: true, evidence: [], failures: [] };
  const evidence = r.evidence;
  const failures = r.failures;

  console.log('\n═══ E2E-015: Auth Flow ═══');

  // Step 1: Login as admin
  const login = await api('POST', '/api/auth/login', { username: 'qa-admin', password: 'Test@12345' });
  assert(login.status === 200, `Login returns 200 (got ${login.status})`, evidence, failures);
  assert(login.json.success === true, 'Login response success=true', evidence, failures);
  assert('admin_token' in cookieJar, 'admin_token cookie set', evidence, failures);
  assert('refresh_token' in cookieJar, 'refresh_token cookie set', evidence, failures);

  // Step 2: Verify identity via /api/auth/me
  const me = await api('GET', '/api/auth/me');
  assert(me.status === 200, `/api/auth/me returns 200 (got ${me.status})`, evidence, failures);
  assert(me.json.data?.user?.username === 'qa-admin', `Username is qa-admin (got ${me.json.data?.user?.username})`, evidence, failures);
  assert(me.json.data?.user?.role === 'admin', `Role is admin (got ${me.json.data?.user?.role})`, evidence, failures);
  assert(me.json.data?.user?.tenantId === QA_TENANT_ID, `TenantId matches QA tenant`, evidence, failures);

  // Step 3: Refresh token
  const refresh = await api('POST', '/api/auth/refresh');
  assert(refresh.status === 200, `Refresh returns 200 (got ${refresh.status})`, evidence, failures);
  assert(refresh.json.success === true, 'Refresh response success=true', evidence, failures);

  // Step 4: Verify still authenticated after refresh
  const me2 = await api('GET', '/api/auth/me');
  assert(me2.status === 200, `Still authenticated after refresh (got ${me2.status})`, evidence, failures);

  // Step 5: Logout
  const logout = await api('POST', '/api/auth/logout');
  assert(logout.status === 200, `Logout returns 200 (got ${logout.status})`, evidence, failures);

  // Step 6: Verify cookies cleared (admin_token should be empty/maxAge=0)
  const setCookies = logout.headers.getSetCookie();
  const adminCookie = setCookies.find(c => c.startsWith('admin_token='));
  assert((adminCookie?.includes('Max-Age=0') || adminCookie?.includes('max-age=0') || adminCookie?.includes('Expires=')) === true,
    'admin_token cleared on logout (Max-Age=0 or Expires)', evidence, failures);

  // Clear cookie jar for subsequent tests
  cookieJar = {};

  r.pass = failures.length === 0;
  return r;
}

// ── E2E-001: Full Service Pipeline ──────────────────────────────────────
async function testFullServicePipeline(): Promise<TestResult> {
  const r: TestResult = { name: 'E2E-001: Full Service Pipeline', pass: true, evidence: [], failures: [] };
  const evidence = r.evidence;
  const failures = r.failures;

  console.log('\n═══ E2E-001: Full Service Pipeline ═══');

  // Login
  await loginAs('qa-admin', 'Test@12345');

  // Snapshot pre-state
  const preProducts = await prisma.product.findMany({ where: { tenantId: QA_TENANT_ID, isDeleted: false }, select: { id: true, stock: true, name: true } });
  const preProductMap = new Map(preProducts.map(p => [p.id, p.stock]));
  const preJournalLines = await prisma.journalEntryLine.count({ where: { tenantId: QA_TENANT_ID } });
  const preStockMovements = await prisma.stockMovement.count({ where: { tenantId: QA_TENANT_ID } });

  // Step 1: Create Customer (name must be letters only per Zod regex)
  // Booking API requires phone: +20 followed by exactly 10 digits
  const phone = '+201998877665';
  const cust = await api('POST', '/api/v1/customers', { name: 'Pipeline Customer', phone, email: 'pipeline@test.com' });
  assert(cust.status === 201, `Customer created: ${cust.status} (body: ${JSON.stringify(cust.json).slice(0, 200)})`, evidence, failures);
  let customerId = cust.json.data?.customer?.id;

  // If creation failed (e.g. 409 duplicate), look up existing
  if (!customerId) {
    const existing = await prisma.customer.findFirst({ where: { phone } });
    customerId = existing?.id;
  }
  assert(!!customerId, `Customer ID: ${customerId}`, evidence, failures);

  // Verify in DB
  const dbCust = await prisma.customer.findFirst({ where: { id: customerId } });
  assert(!!dbCust, 'Customer exists in DB', evidence, failures);
  assert(dbCust?.tenantId === QA_TENANT_ID, `Customer scoped to QA tenant`, evidence, failures);

  // Step 2: Create Vehicle (unique chassis number with timestamp)
  const uniqueChassis = `MLHE2E${Date.now().toString(36).toUpperCase()}`;
  const veh = await api('POST', '/api/v1/vehicles', { make: 'Bajaj', model: 'Pulsar N160', year: 2024, plateNumber: `E2E-${Date.now().toString(36).slice(-4).toUpperCase()}`, chassisNumber: uniqueChassis, customerId });
  assert(veh.status === 201, `Vehicle created: ${veh.status}`, evidence, failures);
  const vehicleId = veh.json.data?.vehicle?.id;
  assert(!!vehicleId, `Vehicle ID: ${vehicleId}`, evidence, failures);

  // Step 3: Create Booking (find a free time slot to avoid cross-tenant conflicts)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 4);
  while (tomorrow.getDay() === 5) tomorrow.setDate(tomorrow.getDate() + 1);
  const bookingDate = tomorrow.toISOString().slice(0, 10);
  let book: { status: number; json: any } = { status: 0, json: {} };
  let bookingTime = '';
  for (let h = 10; h <= 21; h++) {
    const candidate = `${String(h).padStart(2, '0')}:00`;
    book = await api('POST', '/api/v1/bookings', {
      name: 'Pipeline Customer', phone, model: 'Pulsar N160',
      issue: 'Engine noise and oil leak', date: bookingDate, time: candidate,
      make: 'Bajaj', year: 2024, plateNumber: 'E2E-PIPE',
    });
    if (book.status === 201) {
      bookingTime = candidate;
      break;
    }
  }
  assert(book.status === 201, `Booking created at ${bookingTime}: ${book.status} (body: ${JSON.stringify(book.json).slice(0, 300)})`, evidence, failures);
  const bookingId = book.json.data?.booking?.id;

  // Step 4: Create Work Order
  const wo = await api('POST', '/api/v1/work-orders', { description: 'E2E Pipeline: Engine repair + oil change', status: 'in_progress', vehicleId });
  assert(wo.status === 201, `Work order created: ${wo.status}`, evidence, failures);
  const woId = wo.json.data?.workOrder?.id;
  assert(!!woId, `Work order ID: ${woId}`, evidence, failures);

  // Step 5: Add Parts to Work Order (use first product — Engine Oil 10W-40)
  const partProductId = preProducts.find(p => p.name === 'Engine Oil 10W-40')?.id || preProducts[0].id;
  const partStockBefore = preProductMap.get(partProductId) ?? 0;
  const addPart = await api('POST', `/api/v1/work-orders/${woId}/parts`, { productId: partProductId, quantity: 2, unitPrice: 350 });
  assert(addPart.status === 201, `Part added: ${addPart.status}`, evidence, failures);
  assert(addPart.json.data?.part?.quantity === 2, `Part quantity=2`, evidence, failures);

  // Verify stock decremented
  const partProductAfter = await prisma.product.findUnique({ where: { id: partProductId }, select: { stock: true } });
  const partStockAfter = partProductAfter?.stock ?? 0;
  assert(partStockAfter === partStockBefore - 2, `Stock decremented: ${partStockBefore} → ${partStockAfter} (expected ${partStockBefore - 2})`, evidence, failures);

  // Verify COGS journal entry created
  const postPartJournalLines = await prisma.journalEntryLine.count({ where: { tenantId: QA_TENANT_ID } });
  assert(postPartJournalLines > preJournalLines, `Journal entry lines created for parts: ${preJournalLines} → ${postPartJournalLines}`, evidence, failures);

  // Step 6: Add Labour
  const addLabour = await api('POST', `/api/v1/work-orders/${woId}/labour`, { description: 'Engine oil change labour', hours: 2, rate: 200, total: 400 });
  assert(addLabour.status === 201, `Labour added: ${addLabour.status} (body: ${JSON.stringify(addLabour.json).slice(0, 300)})`, evidence, failures);
  assert(Number(addLabour.json.data?.labour?.total) === 400, `Labour total=${Number(addLabour.json.data?.labour?.total)} (expected 400)`, evidence, failures);

  // Step 7: Complete and Pay
  const partsTotal = 700; // 2 × 350
  const labourTotal = 400;
  const totalDue = partsTotal + labourTotal; // 1100
  const completePay = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay`, {
    paymentMethod: 'cash', amountPaid: 1100, partsTotal, labourTotal,
  });
  assert(completePay.status === 200, `Complete-and-pay: ${completePay.status} (body: ${JSON.stringify(completePay.json).slice(0, 200)})`, evidence, failures);
  if (completePay.status !== 200) {
    r.pass = false;
    return r;
  }
  assert(completePay.json.data?.workOrder?.status === 'completed', `WO status = completed`, evidence, failures);
  const invoice = completePay.json.data?.invoice;
  assert(!!invoice, 'Invoice created', evidence, failures);
  if (!invoice) { r.pass = false; return r; }
  assert(invoice.total >= totalDue, `Invoice total=${invoice.total} >= ${totalDue}`, evidence, failures);

  // Step 8: Verify DB state
  const dbWO = await prisma.workOrder.findUnique({ where: { id: woId } });
  assert(dbWO?.status === 'completed', `DB WO status = completed`, evidence, failures);

  const dbInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });
  assert(dbInvoice?.status === 'confirmed', `Invoice status = confirmed`, evidence, failures);
  assert(dbInvoice?.type === 'sale', `Invoice type = sale`, evidence, failures);

  // Step 9: Verify journal entries balance (DR = CR)
  const invoiceJE = await prisma.journalEntry.findFirst({ where: { referenceId: woId, isDeleted: false } });
  if (invoiceJE) {
    const lines = await prisma.journalEntryLine.findMany({ where: { journalEntryId: invoiceJE.id } });
    const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);
    assert(Math.abs(totalDebit - totalCredit) < 0.01, `Journal DR=${totalDebit} = CR=${totalCredit} (diff=${Math.abs(totalDebit - totalCredit)})`, evidence, failures);
  } else {
    // Check all journal entries for this work order
    const allJE = await prisma.journalEntry.findMany({ where: { referenceType: 'work_order', referenceId: woId, isDeleted: false } });
    assert(allJE.length > 0, `At least one journal entry for WO (found ${allJE.length})`, evidence, failures);
  }

  // Step 10: Verify stock movements
  const stockMovements = await prisma.stockMovement.findMany({ where: { reference: { contains: woId.slice(0, 8) }, tenantId: QA_TENANT_ID } });
  assert(stockMovements.length > 0, `Stock movement records created (${stockMovements.length})`, evidence, failures);
  assert(stockMovements.every(sm => sm.type === 'out'), 'All stock movements are type=out', evidence, failures);

  r.pass = failures.length === 0;
  return r;
}

// ── E2E-002: POS Checkout ───────────────────────────────────────────────
async function testPOSCheckout(): Promise<TestResult> {
  const r: TestResult = { name: 'E2E-002: POS Checkout (Invoice Direct)', pass: true, evidence: [], failures: [] };
  const evidence = r.evidence;
  const failures = r.failures;

  console.log('\n═══ E2E-002: POS Checkout ═══');

  await loginAs('qa-admin', 'Test@12345');

  // Pre-state
  const preProducts = await prisma.product.findMany({
    where: { tenantId: QA_TENANT_ID, isDeleted: false, lockInventory: false, category: { not: 'Service' } },
    select: { id: true, stock: true, name: true },
  });
  const testProduct = preProducts.find(p => p.stock >= 3) || preProducts[0];
  if (!testProduct) {
    failures.push('  FAIL: No product with sufficient stock found');
    r.pass = false;
    return r;
  }

  const preStock = Number(testProduct.stock);
  const preJELines = await prisma.journalEntryLine.count({ where: { tenantId: QA_TENANT_ID } });

  // Create invoice directly (POS flow: sale with items + payment)
  const qty = 3;
  const unitPrice = 350; // Engine Oil
  const totalExpected = unitPrice * qty; // 1050

  const invoiceRes = await api('POST', '/api/v1/invoices', {
    type: 'sale',
    items: [{ productId: testProduct.id, quantity: qty }],
    paid: totalExpected,
    paymentMethod: 'cash',
    customerId: null,
  });

  assert(invoiceRes.status === 201, `Invoice created: ${invoiceRes.status} (body: ${JSON.stringify(invoiceRes.json).slice(0, 200)})`, evidence, failures);

  if (invoiceRes.status !== 201) {
    r.pass = false;
    return r;
  }

  const inv = invoiceRes.json.data.invoice;
  assert(!!inv.id, `Invoice ID: ${inv.id}`, evidence, failures);
  assert(inv.type === 'sale', `Invoice type=sale`, evidence, failures);
  assert(inv.status === 'confirmed', `Invoice status=confirmed`, evidence, failures);
  assert(inv.paid === totalExpected, `Paid amount=${inv.paid} (expected ${totalExpected})`, evidence, failures);

  // DB: Stock decremented
  const postStock = await prisma.product.findUnique({ where: { id: testProduct.id }, select: { stock: true } });
  assert(Number(postStock?.stock) === preStock - qty, `Stock: ${preStock} → ${postStock?.stock} (expected ${preStock - qty})`, evidence, failures);

  // DB: Stock movement
  const sm = await prisma.stockMovement.findMany({ where: { productId: testProduct.id, tenantId: QA_TENANT_ID, type: 'out' } });
  assert(sm.length > 0, `Stock movement records exist (${sm.length})`, evidence, failures);

  // DB: Journal entries created
  const postJELines = await prisma.journalEntryLine.count({ where: { tenantId: QA_TENANT_ID } });
  assert(postJELines > preJELines, `Journal lines: ${preJELines} → ${postJELines}`, evidence, failures);

  // Verify DR = CR for this invoice's journal entry
  const invJE = await prisma.journalEntry.findFirst({
    where: { referenceId: inv.id, isDeleted: false },
  });
  if (invJE) {
    const lines = await prisma.journalEntryLine.findMany({ where: { journalEntryId: invJE.id } });
    const dr = lines.reduce((s, l) => s + Number(l.debit), 0);
    const cr = lines.reduce((s, l) => s + Number(l.credit), 0);
    assert(Math.abs(dr - cr) < 0.01, `Journal DR=${dr} = CR=${cr}`, evidence, failures);
    // Cash sale: DR Cash, CR Revenue
    assert(dr > 0, `Debit side > 0 (DR=${dr})`, evidence, failures);
    assert(cr > 0, `Credit side > 0 (CR=${cr})`, evidence, failures);
  } else {
    failures.push('  FAIL: No journal entry found for invoice');
  }

  // DB: Invoice payments
  const payments = await prisma.invoicePayment.findMany({ where: { invoiceId: inv.id } });
  assert(payments.length > 0, `Payment records exist (${payments.length})`, evidence, failures);
  assert(payments.some(p => p.method === 'cash'), 'Cash payment recorded', evidence, failures);

  r.pass = failures.length === 0;
  return r;
}

// ── E2E-003: Payment Idempotency ────────────────────────────────────────
async function testPaymentIdempotency(): Promise<TestResult> {
  const r: TestResult = { name: 'E2E-003: Payment Idempotency', pass: true, evidence: [], failures: [] };
  const evidence = r.evidence;
  const failures = r.failures;

  console.log('\n═══ E2E-003: Payment Idempotency ═══');

  await loginAs('qa-admin', 'Test@12345');

  // Create a work order in progress
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId: QA_TENANT_ID, isDeleted: false } });
  const testVehicle = vehicles[0];
  if (!testVehicle) {
    failures.push('  FAIL: No vehicle found');
    r.pass = false;
    return r;
  }

  const wo = await api('POST', '/api/v1/work-orders', { description: 'E2E Idempotency test WO', status: 'in_progress', vehicleId: testVehicle.id });
  assert(wo.status === 201, `WO created: ${wo.status}`, evidence, failures);
  const woId = wo.json.data?.workOrder?.id;

  // First complete-and-pay
  const pay1 = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay`, {
    paymentMethod: 'cash', amountPaid: 500, partsTotal: 300, labourTotal: 200,
  });
  assert(pay1.status === 200, `First payment: ${pay1.status} (body: ${JSON.stringify(pay1.json).slice(0, 300)})`, evidence, failures);
  assert(pay1.json.data?.workOrder?.status === 'completed', 'WO completed after first payment', evidence, failures);

  // Second attempt (should fail — WO already completed)
  const pay2 = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay`, {
    paymentMethod: 'cash', amountPaid: 500, partsTotal: 300, labourTotal: 200,
  });
  assert(pay2.status === 400, `Second payment blocked: ${pay2.status} (expected 400)`, evidence, failures);
  assert(pay2.json.error?.includes('already completed') || pay2.json.success === false,
    `Error message indicates already completed`, evidence, failures);

  // Verify only ONE invoice exists for this WO
  const invoices = await prisma.invoice.findMany({ where: { workOrderId: woId, isDeleted: false } });
  assert(invoices.length === 1, `Only 1 invoice for WO (found ${invoices.length})`, evidence, failures);

  if (invoices.length !== 1) {
    failures.push('  FAIL: No invoice found');
    r.pass = false;
    return r;
  }
  const payments = await prisma.invoicePayment.findMany({ where: { invoiceId: invoices[0].id } });
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  assert(totalPaid === 500, `Total paid=${totalPaid} (expected 500, not double). Payments: ${JSON.stringify(payments.map(p => ({ method: p.method, amount: Number(p.amount) })))}`, evidence, failures);

  // Verify journal entries: should be exactly 1 set for this WO
  const jeCount = await prisma.journalEntry.count({
    where: { referenceType: 'work_order', referenceId: woId, isDeleted: false },
  });
  assert(jeCount === 1, `Exactly 1 journal entry for WO (found ${jeCount})`, evidence, failures);

  r.pass = failures.length === 0;
  return r;
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  P0 E2E Business Logic Tests                    ║');
  console.log('║  Tenant: QA Test Center                         ║');
  console.log(`║  Target: ${BASE.padEnd(40)} ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  try {
    // Connectivity check
    const health = await api('GET', '/api/auth/me');
    console.log(`\nConnectivity check: /api/auth/me → ${health.status}`);

    results.push(await testAuthFlow());
    results.push(await testFullServicePipeline());
    results.push(await testPOSCheckout());
    results.push(await testPaymentIdempotency());
  } catch (e) {
    console.error('Fatal error:', e);
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.pass) { passed++; console.log(`  ✅ ${r.name}`); }
    else { failed++; console.log(`  ❌ ${r.name}`); for (const f of r.failures) console.log(`     ${f}`); }
  }
  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main();
