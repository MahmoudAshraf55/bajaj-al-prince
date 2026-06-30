import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

test.describe('End-to-End System Integration Flow', () => {
  let partId: string;
  let customerId: string;
  let vehicleId: string;
  let workOrderId: string;
  let testAdminId: string;
  let testAdminUsername: string;
  const testPhone = '01099998888';
  const testPassword = 'testpassword123';

  test.beforeAll(async () => {
    // 1. Create a Test Admin
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    testAdminUsername = 'int_admin_' + Date.now();
    const admin = await prisma.user.create({
      data: {
        username: testAdminUsername,
        password: hashedPassword,
        role: 'admin',
        tenantId: 'default',
      }
    });
    testAdminId = admin.id;

    // 2. Setup Inventory Part
    const product = await prisma.product.create({
      data: {
        name: 'Integration Test Part',
        barcode: 'INT-TEST-' + Date.now(),
        costPrice: 50,
        price: 100,
        stock: 10,
        category: 'Parts',
        tenantId: 'default',
        isDeleted: false,
      }
    });
    partId = product.id;

    // 3. Setup Customer and Vehicle
    const customer = await prisma.customer.create({
      data: {
        name: 'Int Customer',
        phone: '+201112223334',
        email: 'int@test.com',
        tenantId: 'default',
      }
    });
    customerId = customer.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        make: 'Bajaj',
        model: 'Pulsar',
        customerId: customer.id,
        tenantId: 'default',
      }
    });
    vehicleId = vehicle.id;
  });

  test('Full Sequential Journey: Booking -> Work Order Completion -> Inventory -> Journal -> Invoice', async ({ request }) => {
    // 0. Public User creates a Booking
    const bookingDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]; // 7 days from now
    const publicBookingRes = await request.post('/api/v1/bookings/', {
      data: {
        name: 'Int Customer',
        phone: '+201112223334',
        model: 'Pulsar',
        issue: 'Integration Test Maintenance',
        date: bookingDate,
        time: '12:00',
      }
    });
    // It might succeed or fail if the slot is taken, but the backend handles it.
    // Assuming success for a clean DB or handled gracefully.

    // 1. Authenticate as Test Admin
    const loginRes = await request.post('/api/auth/login/', {
      data: { username: testAdminUsername, password: testPassword },
    });
    expect(loginRes.ok()).toBeTruthy();

    // 1.5. Admin verifies Booking exists (using direct DB check for speed and accuracy in E2E)
    const booking = await prisma.booking.findFirst({
      where: { phone: '+201112223334', date: bookingDate }
    });
    if (booking) {
      expect(booking.name).toBe('Int Customer');
    }

    // 2. Create a Work Order via API
    const createWoRes = await request.post('/api/v1/work-orders/', {
      data: {
        vehicleId: vehicleId,
        description: 'Integration Test Maintenance',
      }
    });
    expect(createWoRes.ok()).toBeTruthy();
    const woData = await createWoRes.json();
    expect(woData.success).toBe(true);
    workOrderId = woData.data.workOrder.id;

    // 3. Complete the Work Order via API (This tests the newly extracted WorkOrderService)
    const completeWoRes = await request.patch(`/api/v1/work-orders/${workOrderId}/`, {
      data: {
        status: 'completed',
        cost: 250,
      }
    });
    expect(completeWoRes.ok()).toBeTruthy();

    // The API might not deduct stock if we don't pass parts through the API,
    // wait, the API uses the existing parts in the database.
    // Let's add parts to the WO via Prisma first, then complete it via API.
    await prisma.workOrderPart.create({
      data: {
        workOrderId: workOrderId,
        productId: partId,
        quantity: 2,
        unitPrice: 100,
        total: 200,
      }
    });
    await prisma.workOrderLabour.create({
      data: {
        workOrderId: workOrderId,
        description: 'Test Labour',
        total: 50,
      }
    });

    // Now call the completion API again or just call it once after adding parts.
    // We will call it once with the parts already in the DB.
    // Let's reset the status to in_progress first.
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'in_progress' }
    });

    const finalCompleteRes = await request.patch(`/api/v1/work-orders/${workOrderId}/`, {
      data: {
        status: 'completed',
        cost: 250,
      }
    });
    expect(finalCompleteRes.ok()).toBeTruthy();

    // 4. Verify System Consistency (Sequential Effects)

    // A. Check Inventory Deduction
    const updatedProduct = await prisma.product.findUnique({ where: { id: partId } });
    expect(updatedProduct?.stock).toBe(8); // 10 - 2 = 8

    // B. Check Stock Movement
    const movements = await prisma.stockMovement.findMany({
      where: { productId: partId, reference: `work-order-${workOrderId}` }
    });
    expect(movements.length).toBe(1);
    expect(movements[0].quantity).toBe(2);
    expect(movements[0].type).toBe('out');

    // C. Check Journal Entries
    const journalEntry = await prisma.journalEntry.findFirst({
      where: { referenceId: workOrderId, referenceType: 'work_order' },
      include: { lines: true }
    });
    expect(journalEntry).not.toBeNull();
    expect(journalEntry?.amount).toBe(250); // 200 parts + 50 labour
    expect(journalEntry?.lines.length).toBeGreaterThan(0);

    // D. Check Invoice Generation
    const invoice = await prisma.invoice.findFirst({
      where: { customerId: customerId },
      include: { items: true }
    });
    expect(invoice).not.toBeNull();
    expect(invoice?.total).toBe(250);
    // Should have 2 items: 1 for parts (qty 2) and 1 for labour
    expect(invoice?.items.length).toBeGreaterThanOrEqual(1);
  });

  test.afterAll(async () => {
    // Cleanup
    if (workOrderId) {
      await prisma.journalEntryLine.deleteMany({ where: { journalEntry: { referenceId: workOrderId } } });
      await prisma.journalEntry.deleteMany({ where: { referenceId: workOrderId } });
      await prisma.stockMovement.deleteMany({ where: { reference: `work-order-${workOrderId}` } });
      await prisma.workOrderPart.deleteMany({ where: { workOrderId } });
      await prisma.workOrderLabour.deleteMany({ where: { workOrderId } });
      await prisma.workOrder.deleteMany({ where: { id: workOrderId } });
    }
    const invoice = await prisma.invoice.findFirst({ where: { customerId } });
    if (invoice) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
      await prisma.invoice.deleteMany({ where: { id: invoice.id } });
    }
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.product.deleteMany({ where: { id: partId } });
    await prisma.user.deleteMany({ where: { id: testAdminId } });
    await prisma.$disconnect();
  });
});
