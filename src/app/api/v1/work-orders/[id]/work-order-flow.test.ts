/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// Mock Next.js authentication & rate limiters to focus strictly on ERP business logic
vi.mock('@/lib/auth', () => ({
  withRole: vi.fn((req, roles, handler) => handler({ userId: 'test-admin-id' })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
}));

vi.mock('@/lib/tenant-context', () => ({
  getTenantId: () => 'test-tenant-id',
  DEFAULT_TENANT_ID: 'default',
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
  getClientInfo: () => ({ ipAddress: '127.0.0.1', userAgent: 'vitest' }),
}));

vi.mock('@/lib/whatsapp-client', () => ({
  sendWhatsAppMessageViaService: vi.fn(() => Promise.resolve()),
}));

describe('Work Order Integration Flow API Tests', () => {
  const mockWorkOrderId = 'test-work-order-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: Should deduct product stock correctly when work order is completed', async () => {
    // 1. Mock the findFirst database calls for existing work order and accounts
    const mockExistingWorkOrder = {
      id: mockWorkOrderId,
      status: 'in_progress',
      description: 'Fix engine noise',
      cost: 150.00,
      vehicle: { customer: { id: 'cust-1', name: 'John Doe', phone: '01221370120' } },
    };

    vi.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(mockExistingWorkOrder as any);

    const mockUpdatedWorkOrder = {
      ...mockExistingWorkOrder,
      status: 'completed',
      parts: [
        { productId: 'part-1', quantity: 2, total: 100, unitPrice: 50, product: { id: 'part-1', name: 'Spark Plug' } }
      ],
      labourLines: [
        { description: 'Engine Tune-up', total: 50 }
      ],
    };

    // Mock the transaction queries
    const mockTx = {
      workOrder: {
        update: vi.fn().mockResolvedValue(mockUpdatedWorkOrder),
      },
      account: {
        findFirst: vi.fn().mockResolvedValue({ id: 'acc-id' }),
      },
      journalEntry: {
        create: vi.fn().mockResolvedValue({ id: 'journal-id' }),
      },
      product: {
        update: vi.fn().mockResolvedValue({ id: 'part-1', stock: 8 }),
        findFirst: vi.fn().mockResolvedValue({ id: 'labour-product-id' }),
      },
      stockMovement: {
        create: vi.fn().mockResolvedValue({ id: 'movement-id' }),
      },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'invoice-id' }),
      },
    };

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
      return callback(mockTx as any);
    });

    // 2. Prepare HTTP NextRequest
    const request = new NextRequest(`http://localhost/api/v1/work-orders/${mockWorkOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: mockWorkOrderId }) });
    const responseData = await response.json();

    if (response.status !== 200) {
      console.error('Test 1 failed with error payload:', responseData);
    }

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify stock decrement query was executed
    expect(mockTx.product.update).toHaveBeenCalledWith({
      where: { id: 'part-1' },
      data: { stock: { decrement: 2 } },
    });
  });

  it('Test 2: Should generate correct invoices and balanced JournalEntries on completion', async () => {
    const mockExistingWorkOrder = {
      id: mockWorkOrderId,
      status: 'in_progress',
      description: 'Fix brakes',
      cost: 200.00,
      vehicle: { customer: { id: 'cust-1', name: 'Jane Doe', phone: '01221370120' } },
    };

    vi.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue(mockExistingWorkOrder as any);

    const mockUpdatedWorkOrder = {
      ...mockExistingWorkOrder,
      status: 'completed',
      parts: [
        { productId: 'part-2', quantity: 1, total: 120, unitPrice: 120, product: { id: 'part-2', name: 'Brake Pad' } }
      ],
      labourLines: [
        { description: 'Brake replacement', total: 80 }
      ],
    };

    const mockTx = {
      workOrder: { update: vi.fn().mockResolvedValue(mockUpdatedWorkOrder) },
      account: { findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve({ id: `acc-for-${where.code}` })) },
      journalEntry: { create: vi.fn().mockResolvedValue({ id: 'journal-id' }) },
      product: {
        update: vi.fn().mockResolvedValue({ id: 'part-2' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'labour-product-id' }),
      },
      stockMovement: { create: vi.fn().mockResolvedValue({ id: 'mov-id' }) },
      invoice: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'inv-id' }),
      },
    };

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback) => callback(mockTx as any));

    const request = new NextRequest(`http://localhost/api/v1/work-orders/${mockWorkOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: mockWorkOrderId }) });
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);

    // Verify Invoice matches totals (120 parts + 80 labour = 200 total)
    expect(mockTx.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 200,
          total: 200,
          customerName: 'Jane Doe',
        }),
      })
    );

    // Verify JournalEntry double-entry matching (Debit Accounts Receivable 200, Credit Parts Revenue 120, Credit Service Revenue 80)
    expect(mockTx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 200,
          lines: {
            create: [
              { accountId: 'acc-for-1103', debit: 200, credit: 0, description: 'Work order total', tenantId: 'test-tenant-id' },
              { accountId: 'acc-for-4101', debit: 0, credit: 120, description: 'Parts revenue', tenantId: 'test-tenant-id' },
              { accountId: 'acc-for-4102', debit: 0, credit: 80, description: 'Labour revenue', tenantId: 'test-tenant-id' },
            ],
          },
        }),
      })
    );
  });

  it('Test 3: Should roll back and return 500 when database transaction fails due to validation errors', async () => {
    vi.spyOn(prisma.workOrder, 'findFirst').mockResolvedValue({ id: mockWorkOrderId, status: 'in_progress' } as any);

    // Simulate database transaction failure (e.g. key constraint error or missing accounts)
    vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error('Foreign key constraint violation: product 00000000-0000-0000-0000-000000000001 does not exist'));

    const request = new NextRequest(`http://localhost/api/v1/work-orders/${mockWorkOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: mockWorkOrderId }) });
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toBe('Internal server error');
  });
});
