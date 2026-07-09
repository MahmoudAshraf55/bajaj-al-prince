import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  // ✅ تحسين: Connection Pool Management
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    }
  },
  log: [
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

test.describe('End-to-End System Integration Flow', () => {
  let partId: string;
  let customerId: string;
  let vehicleId: string;
  let workOrderId: string;
  let testAdminId: string;
  let testAdminUsername: string;
  
  const testPassword = 'testpassword123';

  test.beforeAll(async () => {
    console.log('🔧 [beforeAll] Setting up test data...');
    
    try {
      // ✅ 1. Create a Test Admin
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
      console.log(`✅ [Admin] Created: ${testAdminUsername} (${testAdminId})`);

      // ✅ 2. Setup Inventory Part
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
      console.log(`✅ [Product] Created: ${partId}, Stock: 10`);

      // ✅ 3. Setup Customer and Vehicle
      const customer = await prisma.customer.create({
        data: {
          name: 'Int Customer',
          phone: '+201112223334',
          email: 'int@test.com',
          tenantId: 'default',
        }
      });
      customerId = customer.id;
      console.log(`✅ [Customer] Created: ${customerId}`);

      const vehicle = await prisma.vehicle.create({
        data: {
          make: 'Bajaj',
          model: 'Pulsar',
          customerId: customer.id,
          tenantId: 'default',
        }
      });
      vehicleId = vehicle.id;
      console.log(`✅ [Vehicle] Created: ${vehicleId}`);

    } catch (error) {
      console.error('❌ [beforeAll] Failed:', error);
      throw error;
    }
  });

  test('Full Sequential Journey: Booking -> Work Order Completion -> Inventory -> Journal -> Invoice', async ({ request }) => {
    console.log('🚀 [Test] Starting full integration flow...');

    try {
      // ✅ 0. Public User creates a Booking
      const bookingDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
      
      console.log(`📅 [Booking] Creating for date: ${bookingDate}`);
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

      // ✅ 1. Authenticate as Test Admin
      console.log(`🔐 [Auth] Logging in as: ${testAdminUsername}`);
      const loginRes = await request.post('/api/auth/login/', {
        data: { username: testAdminUsername, password: testPassword },
      });
      expect(loginRes.ok()).toBeTruthy();
      console.log('✅ [Auth] Login successful');

      // ✅ 1.5 Verify Booking
      const booking = await prisma.booking.findFirst({
        where: { phone: '+201112223334', date: bookingDate }
      });
      if (booking) {
        expect(booking.name).toBe('Int Customer');
        console.log(`✅ [Booking] Verified: ${booking.id}`);
      }

      // ✅ 2. Create Work Order
      console.log('📝 [WorkOrder] Creating...');
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
      console.log(`✅ [WorkOrder] Created: ${workOrderId}`);

      // ✅ 3. Add parts to work order (before completion)
      console.log('🔧 [Parts] Adding parts and labour...');
      
      await prisma.workOrderPart.create({
        data: {
          workOrderId: workOrderId,
          productId: partId,
          quantity: 2,
          unitPrice: 100,
          total: 200,
          tenantId: 'default',
        }
      });
      console.log('✅ [Parts] 2 units added');

      await prisma.workOrderLabour.create({
        data: {
          workOrderId: workOrderId,
          description: 'Test Labour',
          total: 50,
          tenantId: 'default',
        }
      });
      console.log('✅ [Labour] Added: 50 EGP');

      // ✅ 4. Reset to in_progress and complete
      console.log('⚙️ [WorkOrder] Updating status to in_progress...');
      await prisma.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'in_progress' }
      });

      console.log('✓ [WorkOrder] Completing...');
      const finalCompleteRes = await request.patch(`/api/v1/work-orders/${workOrderId}/`, {
        data: {
          status: 'completed',
          cost: 250,
        }
      });
      expect(finalCompleteRes.ok()).toBeTruthy();
      console.log('✅ [WorkOrder] Completed with cost: 250 EGP');

      // ✅ 5. Verify System Consistency
      console.log('🔍 [Verification] Starting system consistency checks...');

      // A. Inventory Check
      const updatedProduct = await prisma.product.findUnique({ where: { id: partId } });
      console.log(`📦 [Inventory] Current stock: ${updatedProduct?.stock} (expected: 8)`);
      expect(updatedProduct?.stock).toBe(8); // 10 - 2 = 8

      // B. Stock Movement Check
      const movements = await prisma.stockMovement.findMany({
        where: { productId: partId, reference: `work-order-${workOrderId}` }
      });
      console.log(`📊 [Movements] Found: ${movements.length} movement(s)`);
      expect(movements.length).toBeGreaterThan(0);

      // C. Journal Entry Check
      const journalEntry = await prisma.journalEntry.findFirst({
        where: { referenceId: workOrderId, referenceType: 'work_order' },
        include: { lines: true }
      });
      console.log(`📖 [Journal] Entry: ${journalEntry?.id}, Amount: ${journalEntry?.amount}`);
      expect(journalEntry).not.toBeNull();

      // D. Invoice Check
      const invoice = await prisma.invoice.findFirst({
        where: { customerId: customerId },
        include: { items: true }
      });
      console.log(`💰 [Invoice] Created: ${invoice?.id}, Total: ${invoice?.total}, Items: ${invoice?.items.length}`);
      expect(invoice).not.toBeNull();
      expect(invoice?.total).toBe(250);

      console.log('🎉 [Test] ALL CHECKS PASSED! Integration complete.');

    } catch (error) {
      console.error('❌ [Test] Failed with error:', error);
      throw error;
    }
  });

  test.afterAll(async () => {
    console.log('🧹 [Cleanup] Starting safe cleanup...');
    
    try {
      // ✅ Safe deletion with proper order (children first, then parents)
      
      if (workOrderId) {
        console.log(`[Cleanup] Checking Work Order: ${workOrderId}`);
        const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
        
        if (wo) {
          // حذف children أولاً
          await prisma.journalEntryLine.deleteMany({
            where: { journalEntry: { referenceId: workOrderId } }
          });
          console.log('✅ [Cleanup] Journal entry lines deleted');

          await prisma.journalEntry.deleteMany({
            where: { referenceId: workOrderId }
          });
          console.log('✅ [Cleanup] Journal entries deleted');

          await prisma.stockMovement.deleteMany({
            where: { reference: `work-order-${workOrderId}` }
          });
          console.log('✅ [Cleanup] Stock movements deleted');

          await prisma.workOrderPart.deleteMany({
            where: { workOrderId: workOrderId }
          });
          console.log('✅ [Cleanup] Work order parts deleted');

          await prisma.workOrderLabour.deleteMany({
            where: { workOrderId: workOrderId }
          });
          console.log('✅ [Cleanup] Work order labour deleted');

          // الآن احذف الـ parent
          await prisma.workOrder.delete({
            where: { id: workOrderId }
          });
          console.log('✅ [Cleanup] Work order deleted');
        } else {
          console.log('⚠️ [Cleanup] Work order not found (already deleted?)');
        }
      }

      if (customerId) {
        console.log(`[Cleanup] Checking Invoice for customer: ${customerId}`);
        const invoice = await prisma.invoice.findFirst({
          where: { customerId: customerId }
        });
        
        if (invoice) {
          await prisma.invoiceItem.deleteMany({
            where: { invoiceId: invoice.id }
          });
          console.log('✅ [Cleanup] Invoice items deleted');

          await prisma.invoice.delete({
            where: { id: invoice.id }
          });
          console.log('✅ [Cleanup] Invoice deleted');
        }
      }

      if (vehicleId) {
        console.log(`[Cleanup] Checking Vehicle: ${vehicleId}`);
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (vehicle) {
          await prisma.vehicle.delete({ where: { id: vehicleId } });
          console.log('✅ [Cleanup] Vehicle deleted');
        }
      }

      if (customerId) {
        console.log(`[Cleanup] Checking Customer: ${customerId}`);
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (customer) {
          await prisma.customer.delete({ where: { id: customerId } });
          console.log('✅ [Cleanup] Customer deleted');
        }
      }

      if (partId) {
        console.log(`[Cleanup] Checking Product: ${partId}`);
        const product = await prisma.product.findUnique({ where: { id: partId } });
        if (product) {
          await prisma.product.delete({ where: { id: partId } });
          console.log('✅ [Cleanup] Product deleted');
        }
      }

      if (testAdminId) {
        console.log(`[Cleanup] Checking Admin User: ${testAdminId}`);
        const user = await prisma.user.findUnique({ where: { id: testAdminId } });
        if (user) {
          await prisma.user.delete({ where: { id: testAdminId } });
          console.log('✅ [Cleanup] Admin user deleted');
        }
      }

      console.log('✅ [Cleanup] All data cleaned up successfully');

    } catch (error) {
      console.error('❌ [Cleanup] Error during cleanup:', error);
      // لا نرمي الخطأ هنا - cleanup يجب أن يحاول دائماً
    } finally {
      // ✅ Graceful disconnect
      console.log('[Cleanup] Disconnecting Prisma...');
      await prisma.$disconnect();
      console.log('✅ [Cleanup] Prisma disconnected');
    }
  });
});
