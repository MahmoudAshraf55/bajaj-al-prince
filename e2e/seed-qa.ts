/**
 * QA Test Tenant Seed Script
 *
 * Creates an isolated QA tenant with test data for E2E testing.
 * Runs against the existing Neon database under a dedicated tenant.
 * Tenant scoping via Prisma extensions ensures complete data isolation.
 *
 * Usage: npx tsx e2e/seed-qa.ts
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const QA_TENANT_ID = 'qa-test-0000-0000-000000000001';
const QA_TENANT_SLUG = 'qa-test';

const raw = new PrismaClient();

async function seed() {
  console.log('=== QA Test Tenant Seed ===\n');

  // 1. Create QA Tenant (bypass tenant extension — Tenant has no tenantId)
  await raw.tenant.upsert({
    where: { slug: QA_TENANT_SLUG },
    update: {},
    create: { id: QA_TENANT_ID, name: 'QA Test Center', slug: QA_TENANT_SLUG },
  });
  console.log('[OK] QA Tenant created');

  // Use raw Prisma for seeding (bypass tenant extension)
  const pw = await hashPassword('Test@12345');

  // 2. Users
  const users = [
    { username: 'qa-admin', password: pw, role: 'admin' as const },
    { username: 'qa-staff', password: pw, role: 'staff' as const },
    { username: 'qa-viewer', password: pw, role: 'viewer' as const },
  ];
  for (const u of users) {
    await raw.user.upsert({
      where: { username: u.username },
      update: { password: u.password, role: u.role, tenantId: QA_TENANT_ID, isDeleted: false, deletedAt: null, failedAttempts: 0, lockedUntil: null },
      create: { ...u, tenantId: QA_TENANT_ID },
    });
  }
  console.log('[OK] 3 users created (qa-admin, qa-staff, qa-viewer)');

  // 3. Customers
  const customerData = [
    { name: 'Ahmed Hassan', phone: '+201012345678', email: 'ahmed@test.com', address: 'Cairo, Egypt' },
    { name: 'Sara Mohamed', phone: '+201098765432', email: 'sara@test.com', address: 'Giza, Egypt' },
    { name: 'Omar Ali', phone: '+201122334455', email: 'omar@test.com', address: 'Alexandria, Egypt' },
    { name: 'Fatima Khalil', phone: '+201556677889', email: 'fatima@test.com', address: 'Luxor, Egypt' },
    { name: 'Youssef Ibrahim', phone: '+201334455667', email: 'youssef@test.com', address: 'Aswan, Egypt' },
  ];
  const customerIds: string[] = [];
  for (const c of customerData) {
    const existing = await raw.customer.findFirst({ where: { phone: c.phone, tenantId: QA_TENANT_ID } });
    if (existing) { customerIds.push(existing.id); continue; }
    const created = await raw.customer.create({ data: { ...c, tenantId: QA_TENANT_ID } });
    customerIds.push(created.id);
  }
  console.log(`[OK] ${customerIds.length} customers created`);

  // 4. Vehicles (8 across 5 customers)
  const vehicleData = [
    { customerId: customerIds[0], make: 'Bajaj', model: 'Pulsar N160', year: 2024, plateNumber: 'CAI-1234', chassisNumber: 'MLHJC1111AAAA0001' },
    { customerId: customerIds[0], make: 'Bajaj', model: 'Dominar 400', year: 2023, plateNumber: 'CAI-5678', chassisNumber: 'MLHJC1111AAAA0002' },
    { customerId: customerIds[1], make: 'Bajaj', model: 'Pulsar N250', year: 2024, plateNumber: 'GIZ-9012', chassisNumber: 'MLHJC1111AAAA0003' },
    { customerId: customerIds[2], make: 'Bajaj', model: 'Avenger 220', year: 2022, plateNumber: 'ALX-3456', chassisNumber: 'MLHJC1111AAAA0004' },
    { customerId: customerIds[2], make: 'Bajaj', model: 'Discover 125', year: 2023, plateNumber: 'ALX-7890', chassisNumber: 'MLHJC1111AAAA0005' },
    { customerId: customerIds[3], make: 'Bajaj', model: 'Pulsar 180', year: 2024, plateNumber: 'LUX-1111', chassisNumber: 'MLHJC1111AAAA0006' },
    { customerId: customerIds[3], make: 'Bajaj', model: 'Pulsar NS160', year: 2023, plateNumber: 'LUX-2222', chassisNumber: 'MLHJC1111AAAA0007' },
    { customerId: customerIds[4], make: 'Bajaj', model: 'Boxer 150', year: 2024, plateNumber: 'ASW-3333', chassisNumber: 'MLHJC1111AAAA0008' },
  ];
  const vehicleIds: string[] = [];
  for (const v of vehicleData) {
    const existing = await raw.vehicle.findFirst({ where: { chassisNumber: v.chassisNumber, tenantId: QA_TENANT_ID } });
    if (existing) { vehicleIds.push(existing.id); continue; }
    const created = await raw.vehicle.create({ data: { ...v, tenantId: QA_TENANT_ID } });
    vehicleIds.push(created.id);
  }
  console.log(`[OK] ${vehicleIds.length} vehicles created`);

  // 5. Products (20 across categories)
  const productData = [
    // 3W parts (6)
    { name: 'Engine Oil 10W-40', category: '3W', price: 350, costPrice: 200, stock: 50, sku: '3W-OIL-001', barcode: '3W001' },
    { name: 'Brake Pads Front', category: '3W', price: 450, costPrice: 250, stock: 30, sku: '3W-BRK-001', barcode: '3W002' },
    { name: 'Air Filter', category: '3W', price: 180, costPrice: 90, stock: 40, sku: '3W-AIR-001', barcode: '3W003' },
    { name: 'Spark Plug NGK', category: '3W', price: 80, costPrice: 40, stock: 100, sku: '3W-SPK-001', barcode: '3W004' },
    { name: 'Chain Sprocket Kit', category: '3W', price: 1200, costPrice: 700, stock: 15, sku: '3W-CHN-001', barcode: '3W005' },
    { name: 'Clutch Plate Set', category: '3W', price: 650, costPrice: 350, stock: 20, sku: '3W-CLT-001', barcode: '3W006' },
    // 2W parts (7)
    { name: 'Headlight LED', category: '2W', price: 550, costPrice: 300, stock: 25, sku: '2W-HLT-001', barcode: '2W001' },
    { name: 'Tail Light Assembly', category: '2W', price: 380, costPrice: 200, stock: 20, sku: '2W-TLT-001', barcode: '2W002' },
    { name: 'Mirror Set', category: '2W', price: 250, costPrice: 120, stock: 35, sku: '2W-MRR-001', barcode: '2W003' },
    { name: 'Indicator Light Set', category: '2W', price: 200, costPrice: 100, stock: 40, sku: '2W-IND-001', barcode: '2W004' },
    { name: 'Battery 12V', category: '2W', price: 1500, costPrice: 900, stock: 10, sku: '2W-BAT-001', barcode: '2W005' },
    { name: 'Belt Drive', category: '2W', price: 320, costPrice: 180, stock: 25, sku: '2W-BLT-001', barcode: '2W006' },
    { name: 'Tyre 100/90-17', category: '2W', price: 1800, costPrice: 1100, stock: 12, sku: '2W-TYR-001', barcode: '2W007' },
    // COM (common/consumables) (7)
    { name: 'Coolant 1L', category: 'COM', price: 120, costPrice: 60, stock: 60, sku: 'COM-CLN-001', barcode: 'CW001' },
    { name: 'Brake Fluid 500ml', category: 'COM', price: 90, costPrice: 45, stock: 50, sku: 'COM-BRF-001', barcode: 'CW002' },
    { name: 'Grease Tube', category: 'COM', price: 60, costPrice: 30, stock: 80, sku: 'COM-GRS-001', barcode: 'CW003' },
    { name: 'Zip Ties Pack', category: 'COM', price: 30, costPrice: 10, stock: 200, sku: 'COM-ZIP-001', barcode: 'CW004' },
    { name: 'Rag Cloth Pack', category: 'COM', price: 25, costPrice: 8, stock: 150, sku: 'COM-RAG-001', barcode: 'CW005' },
    // Service items (2) — isService: true, lockInventory: true
    { name: 'Basic Service', category: 'Service', price: 500, costPrice: 0, stock: 999, sku: 'SRV-BSC-001', barcode: null, isService: true, lockInventory: true },
    { name: 'Full Engine Overhaul', category: 'Service', price: 3500, costPrice: 0, stock: 999, sku: 'SRV-OVR-001', barcode: null, isService: true, lockInventory: true },
  ];
  const productIds: string[] = [];
  const productPrices: number[] = [];
  for (const p of productData) {
    const existing = await raw.product.findFirst({ where: { sku: p.sku, tenantId: QA_TENANT_ID } });
    if (existing) {
      productIds.push(existing.id);
      productPrices.push(Number(existing.price));
      // Reset stock to ensure E2E tests have sufficient inventory
      if (existing.stock !== p.stock) {
        await raw.product.update({ where: { id: existing.id }, data: { stock: p.stock } });
      }
      continue;
    }
    const created = await raw.product.create({
      data: {
        name: p.name, category: p.category, price: p.price, costPrice: p.costPrice,
        stock: p.stock, sku: p.sku, barcode: p.barcode ?? null,
        isService: p.isService ?? false, lockInventory: p.lockInventory ?? false,
        taxRate: 14, available: true, tenantId: QA_TENANT_ID,
      },
    });
    productIds.push(created.id);
    productPrices.push(p.price);
  }
  console.log(`[OK] ${productIds.length} products created`);

  // 6. Manufacturer + Vehicle Models
  const mfr = await raw.manufacturer.upsert({
    where: { tenantId_name: { tenantId: QA_TENANT_ID, name: 'Bajaj' } },
    update: {},
    create: { name: 'Bajaj', nameAr: 'باجاج', isActive: true, tenantId: QA_TENANT_ID },
  });
  const modelNames = ['Pulsar N160', 'Pulsar N250', 'Dominar 400', 'Avenger 220', 'Discover 125'];
  for (const name of modelNames) {
    await raw.vehicleModel.upsert({
      where: { tenantId_name: { tenantId: QA_TENANT_ID, name } },
      update: {},
      create: { name, make: 'Bajaj', tenantId: QA_TENANT_ID },
    });
  }
  console.log('[OK] Manufacturer + vehicle models seeded');

  // 7. Chart of Accounts
  const accountDefs = [
    { code: '1101', name: 'Cash', type: 'asset' as const },
    { code: '1102', name: 'Bank Accounts', type: 'asset' as const },
    { code: '1103', name: 'Accounts Receivable', type: 'asset' as const },
    { code: '1104', name: 'Inventory', type: 'asset' as const },
    { code: '2101', name: 'Accounts Payable', type: 'liability' as const },
    { code: '2102', name: 'Taxes Payable', type: 'liability' as const },
    { code: '3100', name: 'Owner Capital', type: 'equity' as const },
    { code: '3101', name: 'Retained Earnings', type: 'equity' as const },
    { code: '4100', name: 'Sales Revenue', type: 'revenue' as const },
    { code: '4101', name: 'Parts Sales', type: 'revenue' as const },
    { code: '4102', name: 'Service Revenue', type: 'revenue' as const },
    { code: '5100', name: 'Cost of Goods Sold', type: 'expense' as const },
    { code: '5200', name: 'Operating Expenses', type: 'expense' as const },
    { code: '1201', name: 'Accumulated Depreciation', type: 'asset' as const },
  ];
  for (const a of accountDefs) {
    await raw.account.upsert({
      where: { tenantId_code: { tenantId: QA_TENANT_ID, code: a.code } },
      update: {},
      create: { ...a, tenantId: QA_TENANT_ID },
    });
  }
  console.log('[OK] Chart of Accounts seeded');

  // 8. Bookings (3: PENDING, CONFIRMED, COMPLETED)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const twoDays = new Date();
  twoDays.setDate(twoDays.getDate() + 3);
  // Avoid Fridays
  while (tomorrow.getDay() === 5) tomorrow.setDate(tomorrow.getDate() + 1);
  while (dayAfter.getDay() === 5) dayAfter.setDate(dayAfter.getDate() + 1);
  while (twoDays.getDay() === 5) twoDays.setDate(twoDays.getDate() + 1);

  const bookingData = [
    { name: 'Ahmed Hassan', phone: '+201012345678', model: 'Pulsar N160', issue: 'Engine oil change and general checkup', date: tomorrow.toISOString().slice(0, 10), time: '10:00', status: 'PENDING' as const, customerId: customerIds[0], vehicleId: vehicleIds[0] },
    { name: 'Sara Mohamed', phone: '+201098765432', model: 'Pulsar N250', issue: 'Brake pads replacement', date: dayAfter.toISOString().slice(0, 10), time: '14:00', status: 'CONFIRMED' as const, customerId: customerIds[1], vehicleId: vehicleIds[2] },
    { name: 'Omar Ali', phone: '+201122334455', model: 'Avenger 220', issue: 'Chain adjustment and lubrication', date: twoDays.toISOString().slice(0, 10), time: '11:00', status: 'COMPLETED' as const, customerId: customerIds[2], vehicleId: vehicleIds[3] },
  ];
  const bookingIds: string[] = [];
  for (const b of bookingData) {
    const existing = await raw.booking.findFirst({ where: { phone: b.phone, date: b.date, tenantId: QA_TENANT_ID } });
    if (existing) { bookingIds.push(existing.id); continue; }
    const created = await raw.booking.create({ data: { ...b, tenantId: QA_TENANT_ID } });
    bookingIds.push(created.id);
  }
  console.log(`[OK] ${bookingIds.length} bookings created`);

  // 9. Work Orders (2: IN_PROGRESS, COMPLETED)
  const woData = [
    { description: 'Engine oil change + filter replacement for Pulsar N160', status: 'in_progress' as const, cost: 800, vehicleId: vehicleIds[0], bookingId: bookingIds[0] },
    { description: 'Full brake service for Avenger 220', status: 'completed' as const, cost: 2200, vehicleId: vehicleIds[3], bookingId: bookingIds[2] },
  ];
  const woIds: string[] = [];
  for (const w of woData) {
    const existing = await raw.workOrder.findFirst({ where: { description: w.description, tenantId: QA_TENANT_ID } });
    if (existing) { woIds.push(existing.id); continue; }
    const created = await raw.workOrder.create({ data: { ...w, tenantId: QA_TENANT_ID } });
    woIds.push(created.id);
  }
  console.log(`[OK] ${woIds.length} work orders created`);

  // 10. Supplier + Purchase Order
  const supplier = await raw.supplier.upsert({
    where: { id: 'qa-supplier-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'qa-supplier-0000-0000-000000000001',
      name: 'Bajaj Parts Egypt',
      nameAr: 'قطع غيار باجاج مصر',
      email: 'supply@bajaj-parts.eg',
      phone: '+202234567890',
      taxId: 'EG-TAX-12345',
      tenantId: QA_TENANT_ID,
    },
  });

  const existingPO = await raw.purchaseOrder.findFirst({ where: { tenantId: QA_TENANT_ID } });
  if (!existingPO) {
    const po = await raw.purchaseOrder.create({
      data: {
        number: 'PO-QA-001',
        supplierId: supplier.id,
        status: 'received',
        subtotal: 7000,
        taxTotal: 980,
        total: 7980,
        createdById: (await raw.user.findFirst({ where: { username: 'qa-admin' } }))!.id,
        tenantId: QA_TENANT_ID,
      },
    });
    // Add PO items for first 3 products
    for (let i = 0; i < 3; i++) {
      await raw.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          productId: productIds[i],
          quantity: 10,
          receivedQty: 10,
          unitPrice: productPrices[i] * 0.6,
          total: productPrices[i] * 0.6 * 10,
          tenantId: QA_TENANT_ID,
        },
      });
    }
    console.log('[OK] Purchase order created');
  } else {
    console.log('[SKIP] Purchase order already exists');
  }

  console.log('\n=== QA Seed Complete ===');
  console.log(`Tenant ID: ${QA_TENANT_ID}`);
  console.log(`Admin: qa-admin / Test@12345`);
  console.log(`Staff: qa-staff / Test@12345`);
  console.log(`Viewer: qa-viewer / Test@12345`);
  console.log(`Products: ${productIds.length} (first 18 physical, last 2 service)`);
  console.log(`Customers: ${customerIds.length}`);
  console.log(`Vehicles: ${vehicleIds.length}`);
  console.log(`Bookings: ${bookingIds.length}`);
  console.log(`Work Orders: ${woIds.length}`);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => raw.$disconnect());
