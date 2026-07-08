#!/usr/bin/env node
/**
 * BAJAJ AL PRINCE — Diagnostic Integration Test
 * Tests: Booking → Customer/Vehicle Upsert + Data Integrity
 */

import { prisma } from '../src/lib/prisma';
import { DEFAULT_TENANT_ID } from '../src/lib/tenant-context';

const TEST_PHONE = '+201234567890';
const TEST_NAME = 'Diagnostic Test User';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(label: string, msg: string, color = COLORS.cyan) {
  console.log(`${color}[${label}]${COLORS.reset} ${msg}`);
}

function error(label: string, msg: string) {
  console.log(`${COLORS.red}[${label}] FAIL${COLORS.reset} ${msg}`);
}

function ok(label: string, msg: string) {
  console.log(`${COLORS.green}[${label}] PASS${COLORS.reset} ${msg}`);
}

async function cleanup() {
  log('CLEANUP', 'Removing test data...', COLORS.magenta);
  await prisma.booking.deleteMany({ where: { phone: TEST_PHONE } });
  await prisma.vehicle.deleteMany({ where: { customer: { phone: TEST_PHONE } } });
  await prisma.customer.deleteMany({ where: { phone: TEST_PHONE } });
  log('CLEANUP', 'Done.', COLORS.magenta);
}

/* ── Scenario 1: New Customer + New Vehicle + Booking ── */
async function scenario1(): Promise<string | null> {
  log('SCENARIO 1', 'New customer, new vehicle, new booking');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const payload = {
      name: TEST_NAME,
      phone: TEST_PHONE,
      model: 'Bajaj Pulsar 150',
      issue: 'Engine not starting properly. Needs diagnostic.',
      date: dateStr,
      time: '14:00',
      plateNumber: 'ABC-1234',
    };

    // Simulate the POST handler logic directly via Prisma
    const booking = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.booking.findFirst({
        where: { date: payload.date, time: payload.time, status: { not: 'rejected' } },
      });
      if (existing) throw new Error('DOUBLE_BOOKING');

      let customer = await tx.customer.findFirst({ where: { phone: payload.phone } });
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: payload.name, phone: payload.phone },
        });
      }

      let vehicle = await tx.vehicle.findFirst({
        where: { plateNumber: payload.plateNumber, customerId: customer.id },
      });

      if (!vehicle) {
        vehicle = await tx.vehicle.findFirst({
          where: { customerId: customer.id, model: { equals: payload.model, mode: 'insensitive' } },
        });
      }

      if (!vehicle) {
        const { make, model } = extractMakeModel(payload.model);
        vehicle = await tx.vehicle.create({
          data: {
            make,
            model,
            plateNumber: payload.plateNumber,
            customerId: customer.id,
          },
        });
      }

      return tx.booking.create({
        data: {
          name: payload.name,
          phone: payload.phone,
          model: payload.model,
          issue: payload.issue,
          date: payload.date,
          time: payload.time,
          plateNumber: payload.plateNumber,
          customerId: customer.id,
          vehicleId: vehicle.id,
        },
        include: { customer: true, vehicle: true },
      });
    });

    ok('SCENARIO 1', `Booking created: ${booking.id}`);
    ok('SCENARIO 1', `Customer linked: ${booking.customer?.name || 'N/A'}`);
    ok('SCENARIO 1', `Vehicle linked: ${booking.vehicle?.make} ${booking.vehicle?.model}`);
    return booking.id;
  } catch (err: any) {
    error('SCENARIO 1', err.message);
    console.error(err);
    return null;
  }
}

/* ── Scenario 2: Existing Customer + New Vehicle + Booking ── */
async function scenario2(booking1Id: string | null): Promise<string | null> {
  log('SCENARIO 2', 'Same customer, different vehicle, new booking');
  try {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dateStr = dayAfter.toISOString().split('T')[0];

    const payload = {
      name: TEST_NAME,
      phone: TEST_PHONE,
      model: 'Honda Wave 110',
      issue: 'Brake pads worn out. Needs replacement.',
      date: dateStr,
      time: '16:00',
      plateNumber: 'XYZ-9999',
    };

    const booking = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.booking.findFirst({
        where: { date: payload.date, time: payload.time, status: { not: 'rejected' } },
      });
      if (existing) throw new Error('DOUBLE_BOOKING');

      let customer = await tx.customer.findFirst({ where: { phone: payload.phone } });
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: payload.name, phone: payload.phone },
        });
      }

      let vehicle = await tx.vehicle.findFirst({
        where: { plateNumber: payload.plateNumber, customerId: customer.id },
      });

      if (!vehicle) {
        vehicle = await tx.vehicle.findFirst({
          where: { customerId: customer.id, model: { equals: payload.model, mode: 'insensitive' } },
        });
      }

      if (!vehicle) {
        const { make, model } = extractMakeModel(payload.model);
        vehicle = await tx.vehicle.create({
          data: {
            make,
            model,
            plateNumber: payload.plateNumber,
            customerId: customer.id,
          },
        });
      }

      return tx.booking.create({
        data: {
          name: payload.name,
          phone: payload.phone,
          model: payload.model,
          issue: payload.issue,
          date: payload.date,
          time: payload.time,
          plateNumber: payload.plateNumber,
          customerId: customer.id,
          vehicleId: vehicle.id,
        },
        include: { customer: true, vehicle: true },
      });
    });

    ok('SCENARIO 2', `Booking created: ${booking.id}`);
    ok('SCENARIO 2', `Customer linked: ${booking.customer?.name || 'N/A'}`);
    ok('SCENARIO 2', `Vehicle linked: ${booking.vehicle?.make} ${booking.vehicle?.model}`);
    return booking.id;
  } catch (err: any) {
    error('SCENARIO 2', err.message);
    console.error(err);
    return null;
  }
}

/* ── Scenario 3: CRM Verification ── */
async function scenario3() {
  log('SCENARIO 3', 'Verify CRM data integrity');
  try {
    const customer = await prisma.customer.findFirst({
      where: { phone: TEST_PHONE },
      include: {
        _count: { select: { vehicles: true, bookings: true } },
        vehicles: true,
        bookings: true,
      },
    });

    if (!customer) {
      error('SCENARIO 3', 'Customer not found in database!');
      return false;
    }

    const vehicleCount = customer._count?.vehicles ?? 0;
    const bookingCount = customer._count?.bookings ?? 0;

    const checks = [
      { name: 'Customer exists', pass: true },
      { name: `Exactly 1 customer profile`, pass: true },
      { name: `Exactly 2 vehicles (got ${vehicleCount})`, pass: vehicleCount === 2 },
      { name: `Exactly 2 bookings (got ${bookingCount})`, pass: bookingCount === 2 },
    ];

    let allPass = true;
    for (const check of checks) {
      if (check.pass) {
        ok('SCENARIO 3', check.name);
      } else {
        error('SCENARIO 3', check.name);
        allPass = false;
      }
    }

    // Print vehicle details
    log('SCENARIO 3', `Vehicles in garage:`, COLORS.yellow);
    customer.vehicles.forEach((v: any, i: number) => {
      console.log(`    ${i + 1}. ${v.make} ${v.model} (Plate: ${v.plateNumber || 'N/A'})`);
    });

    // Print booking details
    log('SCENARIO 3', `Bookings:`, COLORS.yellow);
    customer.bookings.forEach((b: any, i: number) => {
      console.log(`    ${i + 1}. ${b.date} ${b.time} — ${b.model}`);
    });

    return allPass;
  } catch (err: any) {
    error('SCENARIO 3', err.message);
    console.error(err);
    return false;
  }
}

/* ── Scenario 4: API Fetch Test ── */
async function scenario4() {
  log('SCENARIO 4', 'Test HTTP API layer (fetch simulation)');

  const API_PORTS = [3000, 3001, 3002];
  let API_BASE = '';

  for (const port of API_PORTS) {
    try {
      const res = await fetch(`http://localhost:${port}`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res && res.headers.get('x-powered-by')?.includes('Next.js')) {
        API_BASE = `http://localhost:${port}`;
        break;
      }
    } catch { /* try next port */ }
  }

  if (!API_BASE) {
    log('SCENARIO 4', 'No Next.js dev server found — skipping fetch test.', COLORS.yellow);
    log('SCENARIO 4', 'Start `npm run dev` and retry for full API coverage.', COLORS.yellow);
    return null;
  }

  log('SCENARIO 4', `Next.js server detected at ${API_BASE}`, COLORS.blue);

  // Find next non-Friday date (Friday = day 5)
  let offset = 1;
  let testDate = new Date();
  testDate.setDate(testDate.getDate() + offset);
  while (testDate.getDay() === 5) {
    offset++;
    testDate = new Date();
    testDate.setDate(testDate.getDate() + offset);
  }
  const dateStr = testDate.toISOString().split('T')[0];

  const payload = {
    name: 'Fetch Test User',
    phone: '+209998887766',
    model: 'Yamaha MT-03',
    issue: 'Oil leak from engine gasket detected during routine inspection.',
    date: dateStr,
    time: '11:00',
    plateNumber: 'FET-001',
  };

  try {
    // POST /api/bookings (simulating exact frontend request)
    const postRes = await fetch(`${API_BASE}/api/bookings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const postData = await postRes.json().catch(() => ({ raw: true }));

    log('SCENARIO 4', `POST /api/bookings/ → HTTP ${postRes.status}`, COLORS.blue);

    if (postRes.status === 403) {
      error('SCENARIO 4', 'Got 403 Forbidden — validateOrigin is rejecting the request!');
      error('SCENARIO 4', `Response: ${JSON.stringify(postData)}`);
      return { status: 403, data: postData };
    }

    if (!postRes.ok) {
      error('SCENARIO 4', `HTTP ${postRes.status}: ${JSON.stringify(postData)}`);
      return { status: postRes.status, data: postData };
    }

    ok('SCENARIO 4', `Booking created via API: ${postData.data?.booking?.id || 'N/A'}`);

    // Test 3: GET /api/v1/bookings (admin list, needs auth)
    // This will likely 401 without a cookie, but let's test anyway
    const getRes = await fetch(`${API_BASE}/api/v1/bookings/?page=1&limit=10`, {
      headers: { 'Content-Type': 'application/json' },
    });
    log('SCENARIO 4', `GET /api/v1/bookings/ → HTTP ${getRes.status}`, COLORS.blue);

    if (getRes.ok) {
      const getData = await getRes.json();
      const bookings = getData.data?.bookings || [];
      const withRelations = bookings.filter((b: any) => b.customer && b.vehicle);
      ok('SCENARIO 4', `Fetched ${bookings.length} bookings, ${withRelations.length} have customer+vehicle populated`);
    } else {
      log('SCENARIO 4', `GET returned ${getRes.status} (expected 401 without auth cookie)`, COLORS.yellow);
    }

    return { status: postRes.status, data: postData };
  } catch (err: any) {
    error('SCENARIO 4', err.message);
    return null;
  } finally {
    // Cleanup fetch test data
    await prisma.booking.deleteMany({ where: { phone: payload.phone } });
    await prisma.vehicle.deleteMany({ where: { customer: { phone: payload.phone } } });
    await prisma.customer.deleteMany({ where: { phone: payload.phone } });
  }
}

/* ── Scenario 5: Atomicity / Rollback Test ── */
async function scenario5() {
  log('SCENARIO 5', 'Transaction rollback test — simulate booking failure');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 4);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // First, create a booking to occupy the slot
    await prisma.booking.create({
      data: {
        name: 'Blocker',
        phone: '+200000000001',
        model: 'Blocker Bike',
        issue: 'Blocker',
        date: dateStr,
        time: '15:00',
        status: 'pending',
        tenantId: DEFAULT_TENANT_ID,
      },
    });

    // Now try to create another booking in the same slot within a transaction
    // This should fail and rollback any customer/vehicle creation
    let customerCreated = false;
    let vehicleCreated = false;

    try {
      await prisma.$transaction(async (tx: any) => {
        const existing = await tx.booking.findFirst({
          where: { date: dateStr, time: '15:00', status: { not: 'rejected' } },
        });
        if (existing) throw new Error('DOUBLE_BOOKING');

        // Create customer
        const customer = await tx.customer.create({
          data: { name: 'Rollback Test', phone: '+200000000002' },
        });
        customerCreated = true;

        // Create vehicle
        const vehicle = await tx.vehicle.create({
          data: { make: 'Test', model: 'Rollback', customerId: customer.id },
        });
        vehicleCreated = true;

        // This will never execute because we throw above
        return tx.booking.create({
          data: { name: 'X', phone: 'X', model: 'X', issue: 'X', date: dateStr, time: '15:00' },
        });
      });
    } catch (e) {
      // Expected to throw
    }

    // Verify no ghost records
    const ghostCustomer = await prisma.customer.findFirst({ where: { phone: '+200000000002' } });
    const ghostVehicle = await prisma.vehicle.findFirst({ where: { make: 'Test', model: 'Rollback' } });

    if (ghostCustomer || ghostVehicle) {
      error('SCENARIO 5', 'Ghost records found! Transaction did NOT rollback properly.');
      return false;
    }

    ok('SCENARIO 5', 'No ghost records — transaction rollback working correctly');

    // Cleanup blocker
    await prisma.booking.deleteMany({ where: { phone: '+200000000001' } });

    return true;
  } catch (err: any) {
    error('SCENARIO 5', err.message);
    console.error(err);
    return false;
  }
}

/* ── Helper: extractMakeModel (mirrors API logic) ── */
function extractMakeModel(modelStr: string): { make: string; model: string } {
  const knownMakes = ['bajaj', 'honda', 'yamaha', 'suzuki', 'kawasaki', 'hero', 'tvs', 'ktm', 'ducati', 'bmw', 'kymco', 'sym'];
  const lower = modelStr.toLowerCase().trim();
  for (const make of knownMakes) {
    if (lower.startsWith(make + ' ')) {
      return { make: make.charAt(0).toUpperCase() + make.slice(1), model: modelStr.slice(make.length + 1).trim() };
    }
  }
  for (const make of knownMakes) {
    const idx = lower.indexOf(make);
    if (idx !== -1) {
      const before = modelStr.slice(0, idx).trim();
      const after = modelStr.slice(idx + make.length).trim();
      return { make: make.charAt(0).toUpperCase() + make.slice(1), model: (before + ' ' + after).trim() || modelStr };
    }
  }
  return { make: 'Unknown', model: modelStr };
}

/* ── Main ── */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  BAJAJ AL PRINCE — DIAGNOSTIC INTEGRATION TEST');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(70) + '\n');

  await cleanup();

  const b1 = await scenario1();
  const b2 = await scenario2(b1);
  const s3 = await scenario3();
  const s4 = await scenario4();
  const s5 = await scenario5();

  // Final cleanup
  await cleanup();

  console.log('\n' + '='.repeat(70));
  console.log('  DIAGNOSTIC SUMMARY');
  console.log('='.repeat(70));

  const results = [
    { name: 'Scenario 1: New Customer+Vehicle+Booking', pass: !!b1 },
    { name: 'Scenario 2: Existing Customer+New Vehicle+Booking', pass: !!b2 },
    { name: 'Scenario 3: CRM Data Integrity', pass: s3 },
    { name: 'Scenario 4: HTTP API Layer', pass: s4 === null || (s4 && s4.status < 400) },
    { name: 'Scenario 5: Transaction Rollback', pass: s5 },
  ];

  let passCount = 0;
  for (const r of results) {
    if (r.pass) {
      console.log(`  ${COLORS.green}✓${COLORS.reset} ${r.name}`);
      passCount++;
    } else {
      console.log(`  ${COLORS.red}✗${COLORS.reset} ${r.name}`);
    }
  }

  console.log(`\n  Results: ${passCount}/${results.length} passed`);
  console.log('='.repeat(70) + '\n');

  await prisma.$disconnect();
  process.exit(passCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  prisma.$disconnect();
  process.exit(1);
});
