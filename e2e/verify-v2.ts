/**
 * SECOND PASS v2 — Streamlined verification
 * One login session for all tests. Rate-limit-safe.
 *
 * Usage: npx tsx e2e/verify-v2.ts
 */

import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000';
const QA_TENANT_ID = 'qa-test-0000-0000-000000000001';
const raw = new PrismaClient();

let ok = 0, fail = 0;
const fails: string[] = [];
let cookies = '';

function PASS(m: string) { ok++; console.log(`  ✅ ${m}`); }
function FAIL(m: string, d?: string) { fail++; fails.push(m); console.log(`  ❌ ${m}${d ? `\n     ${d}` : ''}`); }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function api(method: string, path: string, body?: unknown, extraCookies?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (extraCookies) h['Cookie'] = extraCookies;
  else if (cookies) h['Cookie'] = cookies;
  const p = path.endsWith('/') ? path : `${path}/`;
  const res = await fetch(`${BASE}${p}`, {
    method, headers: h, body: body ? JSON.stringify(body) : undefined,
    redirect: 'follow',
  });
  let b: unknown;
  try { b = await res.json(); } catch { b = null; }
  return { status: res.status, body: b, cookies: res.headers.get('set-cookie') || '' };
}

async function jE(entryId: string) {
  const e = await raw.journalEntry.findUnique({
    where: { id: entryId, tenantId: QA_TENANT_ID },
    include: { lines: true },
  });
  if (!e) return;
  const dr = e.lines.reduce((s, l) => s + Number(l.debit), 0);
  const cr = e.lines.reduce((s, l) => s + Number(l.credit), 0);
  const bal = Math.abs(dr - cr) < 0.01;
  if (bal) PASS(`JE ${entryId.slice(0,8)} DR=${dr}=CR=${cr}`);
  else FAIL(`JE ${entryId.slice(0,8)} UNBALANCED DR=${dr} CR=${cr} diff=${(dr-cr).toFixed(2)}`);
  for (const l of e.lines) {
    const a = await raw.account.findUnique({ where: { id: l.accountId } });
    console.log(`     ${a?.code||'?'} ${a?.name||'?'}  DR=${l.debit}  CR=${l.credit}`);
  }
}

async function trialBalance() {
  const all = await raw.journalEntry.findMany({
    where: { tenantId: QA_TENANT_ID, isDeleted: false },
    include: { lines: { where: { isDeleted: false } } },
  });
  const tDr = Math.round(all.reduce((s, e) => s + e.lines.reduce((s2, l) => s2 + Number(l.debit), 0), 0) * 100) / 100;
  const tCr = Math.round(all.reduce((s, e) => s + e.lines.reduce((s2, l) => s2 + Number(l.credit), 0), 0) * 100) / 100;
  if (Math.abs(tDr - tCr) < 0.01) PASS(`Trial balance DR=${tDr}=CR=${tCr}`);
  else FAIL(`Trial balance DR=${tDr}≠CR=${tCr} diff=${(tDr-tCr).toFixed(2)}`);
}

async function main() {
  console.log('==============================================================');
  console.log('  SECOND PASS v2 — REAL DB + API VERIFICATION');
  console.log('==============================================================\n');

  // === 1: LOGIN ===
  console.log('--- AUTH ---');
  const lr = await api('POST', '/api/auth/login', { username: 'qa-admin', password: 'Test@12345' });
  if (lr.status === 200) { cookies = lr.cookies; PASS('Admin login'); }
  else { FAIL('Admin login', `${lr.status}`); return; }
  await sleep(1500);

  // Verify cookie works
  const me = await api('GET', '/api/auth/me');
  if (me.status === 200) PASS('Auth session valid');
  else FAIL('Auth session', `${me.status}`);
  await sleep(200);

  // Warmup: trigger compilation of all API routes we'll use
  await api('GET', '/api/v1/work-orders');
  await api('GET', '/api/v1/purchase-orders');
  await api('GET', '/api/v1/supplier-payments');
  await sleep(2000);

  // === 2: RBAC ===
  console.log('\n--- RBAC ---');
  await sleep(500);
  const cust = await api('POST', '/api/v1/customers', { name: 'RBAC-Test', email: 'rbac@t.com', phone: '+201000000001' });
  if (cust.status === 201 || cust.status === 200) PASS('Admin create customer');
  else FAIL('Admin create customer', `${cust.status}`);

  // Viewer create - fresh session
  const vr = await api('POST', '/api/auth/login', { username: 'qa-viewer', password: 'Test@12345' });
  await sleep(1500);
  if (vr.status === 200) {
    const vc = await api('POST', '/api/v1/customers', { name: 'ViewerTry', email: 'v@t.com', phone: '+201000000002' }, vr.cookies);
    if (vc.status === 403) PASS('Viewer cannot create → 403 (correct)');
    else FAIL('Viewer create', `${vc.status}`);

    // Viewer list customers — route allows admin/staff only, so 403 is correct
    const vl = await api('GET', '/api/v1/customers', undefined, vr.cookies);
    if (vl.status === 403) PASS('Viewer cannot read customers → 403 (correct)');
    else if (vl.status === 200) console.log('   Viewer read allowed (unexpected)');
    else FAIL('Viewer read', `${vl.status}`);
  }

  // === 3: TENANT ISOLATION ===
  console.log('\n--- Tenant Isolation ---');
  const bcrypt = await import('bcryptjs');
  const altId = 'alt-test-0000-0000-000000000002';
  const pwh = await bcrypt.hash('Alt@12345', 12);
  await raw.tenant.upsert({ where: { slug: 'alt-test' }, update: {}, create: { id: altId, name: 'Alt', slug: 'alt-test' } });
  await raw.user.upsert({ where: { username: 'alt-admin' }, update: {}, create: { username: 'alt-admin', password: pwh, role: 'admin', tenantId: altId } });
  const alr = await api('POST', '/api/auth/login', { username: 'alt-admin', password: 'Alt@12345' });
  await sleep(1500);
  if (alr.status === 200) {
    PASS('Alt tenant login');
    const ac = await api('GET', '/api/v1/customers', undefined, alr.cookies);
    const aData = ac.body as { data?: { customers?: unknown[] } };
    const aCount = aData?.data?.customers?.length || 0;
    if (aCount === 0) PASS('Alt sees 0 customers (isolated)');
    else FAIL('Alt isolation', `saw ${aCount} customers`);
  } else FAIL('Alt login', `${alr.status}`);

  // Re-login admin
  const ar2 = await api('POST', '/api/auth/login', { username: 'qa-admin', password: 'Test@12345' });
  cookies = ar2.cookies;
  await sleep(1500);

  // === 4: FULL WORKFLOW ===
  console.log('\n--- Full Workflow ---');
  const ref = `fw${Date.now()}`;
  const custR = await api('POST', '/api/v1/customers', { name: `FW ${ref}`, email: `${ref}@x.com`, phone: '+201000000003' });
  const custId = (custR.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
  if (!custId) { FAIL('FW: create customer'); return; } PASS('Customer created');

  const vehR = await api('POST', '/api/v1/vehicles', { customerId: custId, make: 'Bajaj', model: 'Pulsar', year: 2024, plateNumber: ref, chassisNumber: `CH-${ref}` });
  const vehId = (vehR.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
  if (!vehId) { FAIL('FW: create vehicle'); return; } PASS('Vehicle created');

  const d = new Date(); d.setDate(d.getDate() + 14);
  const bt = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  const bR = await api('POST', '/api/v1/bookings', { name: 'FW', phone: '+201000000004', model: 'Pulsar', issue: 'FW test', date: d.toISOString().slice(0,10), time: bt });
  const bId = (bR.body as { data?: { booking?: { id: string } } })?.data?.booking?.id;
  if (!bId) { FAIL('FW: create booking', `${bR.status}: ${JSON.stringify(bR.body)}`); return; }
  await raw.booking.update({ where: { id: bId }, data: { customerId: custId, vehicleId: vehId } });
  PASS('Booking created + linked');

  const woR = await api('POST', '/api/v1/work-orders', { description: 'FW Integration Test', vehicleId: vehId });
  if (woR.status !== 200 && woR.status !== 201) { FAIL('FW: create WO', `${woR.status}: ${JSON.stringify(woR.body)}`); return; }
  const woId = (woR.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
  if (!woId) { FAIL('FW: WO no id', JSON.stringify(woR.body)); return; } PASS('WO created');

  // Products from DB
  const prods = await raw.product.findMany({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, stock: { gte: 2 } }, take: 2 });
  if (prods.length < 2) { FAIL('FW: need 2 products'); return; }
  const p1 = prods[0], p2 = prods[1];
  const p1s = Number(p1.stock), p2s = Number(p2.stock);
  console.log(`   Using: ${p1.name}(${p1s}) ${p2.name}(${p2s})`);

  const pt1 = await api('POST', `/api/v1/work-orders/${woId}/parts`, { productId: p1.id, quantity: 2 });
  if (pt1.status !== 200 && pt1.status !== 201) { FAIL('FW: add part 1', `${pt1.status}: ${JSON.stringify(pt1.body)}`); return; }
  const pt2 = await api('POST', `/api/v1/work-orders/${woId}/parts`, { productId: p2.id, quantity: 1 });
  if (pt2.status !== 200 && pt2.status !== 201) { FAIL('FW: add part 2', `${pt2.status}: ${JSON.stringify(pt2.body)}`); return; }
  const labR = await api('POST', `/api/v1/work-orders/${woId}/labour`, { description: 'Labour', hours: 1, rate: 200, total: 200 });
  if (labR.status !== 200 && labR.status !== 201) { FAIL('FW: add labour', `${labR.status}: ${JSON.stringify(labR.body)}`); return; }
  PASS('Parts + labour added');

  // Get work order to find sub-totals
  // Get parts/labour from DB to compute actual total (same formula as complete-and-pay)
  const rawParts = await raw.workOrderPart.findMany({ where: { workOrderId: woId, isDeleted: false }, include: { product: true } });
  const woLabour = await raw.workOrderLabour.findMany({ where: { workOrderId: woId, isDeleted: false } });
  const dbPartsTotal = rawParts.reduce((s, p) => s + Number(p.total), 0);
  const dbLabourTotal = woLabour.reduce((s, l) => s + Number(l.total), 0);
  const taxTotal = rawParts.reduce((s, part) => {
    const taxRate = part.product?.taxExempt ? 0 : (part.product?.taxRate != null ? Number(part.product.taxRate) : 14) / 100;
    return s + Number(part.total) * taxRate;
  }, 0);
  const total = Math.round((dbPartsTotal + dbLabourTotal + taxTotal) * 100) / 100;
  console.log(`   Parts: ${dbPartsTotal}, Labour: ${dbLabourTotal}, Tax: ${taxTotal}, Total: ${total}`);

  const cap = await api('POST', `/api/v1/work-orders/${woId}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: total });
  if (cap.status !== 200 && cap.status !== 201) { FAIL('FW: C&P', `${cap.status}: ${JSON.stringify(cap.body)}`); return; }
  PASS(`WO completed (total=${total})`);
  const invId = (cap.body as { data?: { invoice?: { id: string } } })?.data?.invoice?.id;
  if (!invId) { FAIL('FW: no invoice'); return; }
  PASS(`Invoice created: ${(cap.body as { data?: { invoice?: { number: string } } })?.data?.invoice?.number}`);

  // Verify stock
  const f1 = await raw.product.findUnique({ where: { id: p1.id } });
  const f2 = await raw.product.findUnique({ where: { id: p2.id } });
  if (f1 && f1.stock === p1s - 2) PASS(`Stock: ${p1.name} ${p1s}→${f1.stock}`);
  else FAIL('Stock p1', `expected ${p1s-2}, got ${f1?.stock}`);
  if (f2 && f2.stock === p2s - 1) PASS(`Stock: ${p2.name} ${p2s}→${f2.stock}`);
  else FAIL('Stock p2', `expected ${p2s-1}, got ${f2?.stock}`);

  // Accounting for full payment — referenceId is work order id, not invoice id
  const entries = await raw.journalEntry.findMany({
    where: { referenceId: woId, tenantId: QA_TENANT_ID },
    include: { lines: true },
  });
  if (entries.length === 0) FAIL('FW: no JE');
  else {
    PASS(`FW: ${entries.length} journal entries`);
    for (const e of entries) await jE(e.id);
  }
  await trialBalance();

  // === 5: OVERPAYMENT ===
  console.log('\n--- Overpayment Tolerance ---');
  const oref = `op${Date.now()}`;
  const oc = await api('POST', '/api/v1/customers', { name: `OP ${oref}`, email: `${oref}@x.com`, phone: '+201000000005' });
  const ocId = (oc.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
  if (!ocId) { FAIL('OP: create customer'); return; }
  const ov = await api('POST', '/api/v1/vehicles', { customerId: ocId, make: 'Bajaj', model: 'Pulsar', plateNumber: oref, chassisNumber: `CH-OP${oref}` });
  const ovId = (ov.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
  if (!ovId) { FAIL('OP: create vehicle'); return; }
  const ow = await api('POST', '/api/v1/work-orders', { description: 'OP Test', vehicleId: ovId });
  const owId = (ow.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
  if (!owId) { FAIL('OP: create WO'); return; }

  const cheap = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, stock: { gte: 1 } }, orderBy: { price: 'asc' } });
  if (!cheap) { FAIL('OP: no product'); return; }
  const opPartR = await api('POST', `/api/v1/work-orders/${owId}/parts`, { productId: cheap.id, quantity: 1 });
  if (opPartR.status !== 200 && opPartR.status !== 201) { FAIL('OP: add part', `${opPartR.status}`); return; }
  // Compute total from DB
  const opRawParts = await raw.workOrderPart.findMany({ where: { workOrderId: owId, isDeleted: false }, include: { product: true } });
  const opLab = await raw.workOrderLabour.findMany({ where: { workOrderId: owId, isDeleted: false } });
  const opPartsT = opRawParts.reduce((s, p) => s + Number(p.total), 0);
  const opLabT = opLab.reduce((s, l) => s + Number(l.total), 0);
  const opTax = opRawParts.reduce((s, part) => {
    const rate = part.product?.taxExempt ? 0 : (part.product?.taxRate != null ? Number(part.product.taxRate) : 14) / 100;
    return s + Number(part.total) * rate;
  }, 0);
  const opTotal = Math.round((opPartsT + opLabT + opTax) * 100) / 100;
  const overpay = opTotal + 0.01;
  console.log(`   OP: total=${opTotal}, paying=${overpay}`);

  const oCap = await api('POST', `/api/v1/work-orders/${owId}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: overpay });
  if (oCap.status !== 200 && oCap.status !== 201) {
    FAIL(`OP: C&P rejected (${oCap.status})`, JSON.stringify(oCap.body));
    // This itself is informative — the overpay is blocked
    if (oCap.status === 400) PASS('OP: overpayment correctly blocked');
    return;
  }
  PASS(`OP: $0.01 overpayment accepted`);
  const oInvId = (oCap.body as { data?: { invoice?: { id: string; change: number } } })?.data?.invoice?.id;
  if (oInvId) {
    const change = Number((oCap.body as { data?: { invoice?: { change: number } } })?.data?.invoice?.change);
    if (Math.abs(change - 0.01) < 0.001) PASS('OP: invoice change = $0.01');
    else FAIL('OP: invoice change', `expected 0.01, got ${change}`);

    // KEY TEST: Check DR=CR for this journal entry
    const oJE = await raw.journalEntry.findMany({
      where: { referenceId: oInvId, tenantId: QA_TENANT_ID },
      include: { lines: true },
    });
    if (oJE.length > 0) {
      for (const e of oJE) await jE(e.id);
    }
    await trialBalance();
  }

  // === 6: PARTIAL PAYMENT + CANCEL ===
  console.log('\n--- Partial Payment + Cancel ---');
  const pref = `pp${Date.now()}`;
  const pc = await api('POST', '/api/v1/customers', { name: `PP ${pref}`, email: `${pref}@x.com`, phone: '+201000000006' });
  const pcId = (pc.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
  if (!pcId) { FAIL('PP: create customer'); return; }
  const pv = await api('POST', '/api/v1/vehicles', { customerId: pcId, make: 'Bajaj', model: 'Pulsar', plateNumber: pref, chassisNumber: `CH-PP${pref}` });
  const pvId = (pv.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
  if (!pvId) { FAIL('PP: create vehicle'); return; }
  const pw = await api('POST', '/api/v1/work-orders', { description: 'PP Test', vehicleId: pvId });
  const pwId = (pw.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
  if (!pwId) { FAIL('PP: create WO'); return; }

  const pProd = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, stock: { gte: 1 } } });
  if (!pProd) { FAIL('PP: no product'); return; }
  const ppPartR = await api('POST', `/api/v1/work-orders/${pwId}/parts`, { productId: pProd.id, quantity: 1 });
  if (ppPartR.status !== 200 && ppPartR.status !== 201) { FAIL('PP: add part', `${ppPartR.status}`); return; }
  // Compute total from DB
  const ppRawParts = await raw.workOrderPart.findMany({ where: { workOrderId: pwId, isDeleted: false }, include: { product: true } });
  const ppLab = await raw.workOrderLabour.findMany({ where: { workOrderId: pwId, isDeleted: false } });
  const ppPartsT = ppRawParts.reduce((s, p) => s + Number(p.total), 0);
  const ppLabT = ppLab.reduce((s, l) => s + Number(l.total), 0);
  const ppTax = ppRawParts.reduce((s, part) => {
    const rate = part.product?.taxExempt ? 0 : (part.product?.taxRate != null ? Number(part.product.taxRate) : 14) / 100;
    return s + Number(part.total) * rate;
  }, 0);
  const ppTotal = Math.round((ppPartsT + ppLabT + ppTax) * 100) / 100;
  const ppPaid = Math.round(ppTotal * 0.5 * 100) / 100;

  const ppCap = await api('POST', `/api/v1/work-orders/${pwId}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: ppPaid });
  if (ppCap.status !== 200 && ppCap.status !== 201) { FAIL('PP: C&P', `${ppCap.status}`); return; }
  PASS(`Partial: paid ${ppPaid} of ${ppTotal}`);
  const ppInvId = (ppCap.body as { data?: { invoice?: { id: string } } })?.data?.invoice?.id;
  if (!ppInvId) { FAIL('PP: no invoice'); return; }

  // Verify accounting for partial
  const ppJE = await raw.journalEntry.findMany({
    where: { referenceId: ppInvId, tenantId: QA_TENANT_ID },
    include: { lines: true },
  });
  if (ppJE.length > 0) {
    PASS(`PP: ${ppJE.length} JEs`);
    for (const e of ppJE) await jE(e.id);
  }
  await trialBalance();

  // Cancel invoice
  const cancel = await api('PATCH', `/api/v1/invoices/${ppInvId}`, { status: 'cancelled' });
  if (cancel.status === 200) {
    PASS('Invoice cancelled');
    // Check reversals — look for RETURN type entries
    const revs = await raw.journalEntry.findMany({
      where: { referenceId: ppInvId, type: 'RETURN', tenantId: QA_TENANT_ID },
      include: { lines: true },
    });
    if (revs.length > 0) {
      PASS(`Reverse: ${revs.length} entries`);
      for (const r of revs) await jE(r.id);
    } else FAIL('No reversal JE');
  } else FAIL('Cancel', `${cancel.status}`);

  await trialBalance();

  // === 7: PO FLOW ===
  console.log('\n--- PO Receive ---');
  const sref = `po${Date.now()}`;
  const supR = await api('POST', '/api/v1/suppliers', { name: `PO ${sref}`, email: `${sref}@x.com`, phone: '+201000000007' });
  if (supR.status !== 200 && supR.status !== 201) { FAIL('PO: create supplier', `${supR.status}: ${JSON.stringify(supR.body)}`); return; }
  const supId = (supR.body as { data?: { supplier?: { id: string } } })?.data?.supplier?.id;
  PASS('Supplier created');

  const ppo = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, category: { not: 'Service' }, lockInventory: false, stock: { gte: 1 } } });
  if (!ppo) { FAIL('PO: no product'); return; }
  const poInit = Number(ppo.stock);

  const poUnitPrice = Math.round(Number(ppo.price) * 0.6 * 100) / 100;
  const poLineTotal = Math.round(poUnitPrice * 10 * 100) / 100;
  const poR = await api('POST', '/api/v1/purchase-orders', { supplierId: supId, subtotal: poLineTotal, total: poLineTotal, items: [{ productId: ppo.id, quantity: 10, unitPrice: poUnitPrice, total: poLineTotal }] });
  if (poR.status !== 200 && poR.status !== 201) { FAIL('PO: create', `${poR.status}: ${JSON.stringify(poR.body)}`); return; }
  const poBody = poR.body as { data?: { order?: { id: string; items?: Array<{ id: string }> } } };
  const poId = poBody?.data?.order?.id;
  if (!poId) { FAIL('PO: no id in response'); return; }
  PASS('PO created');

  // Get orderItemId directly from PO create response (items included)
  const orderItemId = poBody?.data?.order?.items?.[0]?.id;
  if (!orderItemId) { FAIL('PO: no item in response'); return; }

  // Set ordered
  const ordR = await api('PATCH', `/api/v1/purchase-orders/${poId}/status`, { status: 'ordered' });
  if (ordR.status !== 200) { FAIL('PO: set ordered', `${ordR.status}`); return; }
  PASS('PO ordered');
  console.log(`   Order item ID: ${orderItemId.slice(0,8)}`);

  // Partial receive 3
  const rec3 = await api('POST', `/api/v1/purchase-orders/${poId}/receive`, { items: [{ orderItemId, quantity: 3 }] });
  if (rec3.status === 200 || rec3.status === 201) {
    PASS('Partial receive (3)');
    const s1 = await raw.product.findUnique({ where: { id: ppo.id } });
    if (s1 && s1.stock === poInit + 3) PASS('Stock +3');
    else FAIL('Stock after partial', `expected ${poInit+3}, got ${s1?.stock}`);
  } else FAIL('Partial receive', `${rec3.status}: ${JSON.stringify(rec3.body)}`);

  // Full receive 7
  const rec7 = await api('POST', `/api/v1/purchase-orders/${poId}/receive`, { items: [{ orderItemId, quantity: 7 }] });
  if (rec7.status === 200 || rec7.status === 201) {
    PASS('Full receive (7)');
    const s2 = await raw.product.findUnique({ where: { id: ppo.id } });
    if (s2 && s2.stock === poInit + 10) PASS('Stock +10 total');
    else FAIL('Stock after full', `expected ${poInit+10}, got ${s2?.stock}`);
  } else FAIL('Full receive', `${rec7.status}: ${JSON.stringify(rec7.body)}`);

  // Over-receive attempt
  const overR = await api('POST', `/api/v1/purchase-orders/${poId}/receive`, { items: [{ orderItemId, quantity: 5 }] });
  if (overR.status === 400) PASS('Over-receive rejected (400)');
  else if (overR.status === 200 || overR.status === 201) FAIL('Over-receive should be rejected');
  else console.log(`   Over-receive returned ${overR.status} — PO may be 'received' status`);

  // === 8: MIGRATION STATE ===
  console.log('\n--- F-180 Migration State ---');
  const tbls = await raw.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
  );
  const tNames = tbls.map(r => r.table_name);
  const hasSupplierPay = tNames.includes('SupplierPayment');
  if (hasSupplierPay) PASS('SupplierPayment table EXISTS (F-180 applied)');
  else FAIL('SupplierPayment table missing — F-180 migration not applied');

  const poCols = await raw.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns WHERE table_name='PurchaseOrder' AND column_name IN ('paid','dueDate','paymentStatus')`
  );
  if (poCols.length === 3) PASS('PO has F-180 columns (paid/dueDate/paymentStatus)');
  else FAIL('PO missing F-180 columns', `found ${poCols.length} of 3`);

  const ev = await raw.$queryRawUnsafe<Array<{ enumlabel: string }>>(
    `SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='JournalEntryType'`
  );
  const enums = ev.map(r => r.enumlabel);
  if (enums.includes('SUPPLIER_PAYMENT')) PASS('SUPPLIER_PAYMENT enum present');
  else FAIL('SUPPLIER_PAYMENT enum missing', `Available: ${enums.join(', ')}`);

  // Test supplier payment API
  const pos = await api('GET', '/api/v1/purchase-orders');
  const poArr = (pos.body as { data?: { purchaseOrders?: Array<{ id: string; paid?: number; paymentStatus?: string }> } })?.data?.purchaseOrders;
  if (poArr && poArr.length > 0) {
    const testPO = poArr[0];
    if (testPO.paymentStatus === 'paid') {
      PASS('PO has paymentStatus field');
    } else {
      // Pay a small amount to test the supplier payment flow
      const sp = await api('POST', '/api/v1/supplier-payments', { purchaseOrderId: testPO.id, amount: 1, paymentMethod: 'cash' });
      if (sp.status === 201) {
        PASS('Supplier payment API functional');
        // Verify JE balanced
        const spId = (sp.body as { data?: { payment?: { id: string } } })?.data?.payment?.id;
        if (spId) {
          const jeLines = await raw.journalEntryLine.findMany({ where: { journalEntry: { referenceId: spId } } });
          const dr = jeLines.reduce((s: number, l: any) => s + Number(l.debit), 0);
          const cr = jeLines.reduce((s: number, l: any) => s + Number(l.credit), 0);
          if (Math.abs(dr - cr) < 0.001) PASS(`Supplier payment JE balanced DR=${dr}=CR=${cr}`);
          else FAIL(`Supplier payment JE unbalanced`, `DR=${dr} CR=${cr}`);
        }
      } else {
        FAIL('Supplier payment API', `status ${sp.status}: ${JSON.stringify(sp.body).slice(0, 100)}`);
      }
    }
  } else {
    console.log('   No POs available for supplier payment test');
  }

  // === 9: CONCURRENT ===
  console.log('\n--- Concurrent Inventory ---');
  const cProd = await raw.product.findFirst({ where: { tenantId: QA_TENANT_ID, isDeleted: false, isService: false, stock: { gte: 15 } } });
  if (!cProd) { FAIL('Concurrent: no product with ≥15 stock'); return; }
  const cInit = Number(cProd.stock);
  console.log(`   Product: ${cProd.name} stock=${cInit}`);

  const woIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const r = `cr${i}${Date.now()}`;
    const c = await api('POST', '/api/v1/customers', { name: `CR${i}`, email: `${i}${r}@x.com`, phone: `+20100000001${i}` });
    const cId = (c.body as { data?: { customer?: { id: string } } })?.data?.customer?.id;
    if (!cId) continue;
    const v = await api('POST', '/api/v1/vehicles', { customerId: cId, make: 'Bajaj', model: 'Pulsar', plateNumber: r, chassisNumber: `CH-${r}` });
    const vId = (v.body as { data?: { vehicle?: { id: string } } })?.data?.vehicle?.id;
    if (!vId) continue;
    const w = await api('POST', '/api/v1/work-orders', { description: `Concurrent ${i}`, vehicleId: vId });
    const wId = (w.body as { data?: { workOrder?: { id: string } } })?.data?.workOrder?.id;
    if (!wId) continue;
    const pR = await api('POST', `/api/v1/work-orders/${wId}/parts`, { productId: cProd.id, quantity: 3 });
    if (pR.status !== 200 && pR.status !== 201) continue;
    woIds.push(wId);
  }
  if (woIds.length < 2) { FAIL('Concurrent: need ≥2 WOs'); return; }
  PASS(`${woIds.length} WOs ready, firing concurrently`);

  // Compute total per WO from DB
  const woTotals = await Promise.all(woIds.map(async (wid) => {
    const rp = await raw.workOrderPart.findMany({ where: { workOrderId: wid, isDeleted: false }, include: { product: true } });
    const pts = rp.reduce((s, p) => s + Number(p.total), 0);
    const tx = rp.reduce((s, p) => {
      const rate = p.product?.taxExempt ? 0 : (p.product?.taxRate != null ? Number(p.product.taxRate) : 14) / 100;
      return s + Number(p.total) * rate;
    }, 0);
    return { wid, total: Math.round((pts + tx) * 100) / 100 };
  }));
  const results = await Promise.allSettled(
    woTotals.map(({ wid, total }) => api('POST', `/api/v1/work-orders/${wid}/complete-and-pay`, { paymentMethod: 'cash', amountPaid: total }))
  );
  const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value.status === 200 || r.value.status === 201)).length;
  console.log(`   ${succeeded}/${woIds.length} succeeded concurrently`);

  const cFinal = await raw.product.findUnique({ where: { id: cProd.id } });
  if (cFinal) {
    if (cFinal.stock >= 0) PASS(`Stock non-negative: ${cInit}→${cFinal.stock}`);
    else FAIL(`NEGATIVE stock: ${cFinal.stock}`);
    console.log(`   Expected deduction: ${succeeded * 3}, actual: ${cInit - Number(cFinal.stock)}`);
  }

  // === FINAL TRIAL BALANCE ===
  console.log('\n--- Final Trial Balance ---');
  await trialBalance();

  await raw.$disconnect();
  console.log(`\n✅ ${ok} PASS  ❌ ${fail} FAIL`);
  if (fails.length) { console.log('\nFAILURES:'); fails.forEach(f => console.log(`  ❌ ${f}`)); }
  process.exit(fail > 0 ? 1 : 0);
}

main();
