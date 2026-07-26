import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { withSecurityHeaders } from '@/lib/security';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { logAudit, getClientInfo } from '@/lib/audit';
import { sanitizedString } from '@/lib/sanitize';
import { logger } from '@/lib/logger';
import { sendWhatsAppMessageViaService } from '@/lib/whatsapp-client';
import { buildMessage } from '@/lib/whatsapp-templates';
import { z } from 'zod';
import { AccountingService } from '@/services/AccountingService';
import { createDoubleEntry } from '@/lib/journal';

import { WorkOrderService } from '@/services/WorkOrderService';
const updateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  description: sanitizedString(z.string().min(3).max(2000)).optional(),
  cost: z.number().min(0).max(999999.99).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const { id } = await params;
      const body = await req.json();
      const data = updateSchema.parse(body);

      const existing = await prisma.workOrder.findFirst({ where: { id, isDeleted: false } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

        const isCompleting = data.status === 'completed' && existing.status !== 'completed';
        const isCancelling = data.status === 'cancelled' && existing.status !== 'cancelled' && existing.status !== 'completed';
        const isCostUpdate = data.cost !== undefined && data.cost !== Number(existing.cost);
      const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

      const workOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.workOrder.update({
          where: { id },
          data: {
            ...(data.status && { status: data.status }),
            ...(data.description && { description: data.description }),
            ...(data.cost !== undefined && { cost: data.cost }),
          },
          include: {
            vehicle: { include: { customer: true } },
            parts: { where: { isDeleted: false }, include: { product: { select: { id: true, name: true, costPrice: true, lockInventory: true } } } },
            labourLines: { where: { isDeleted: false } },
          },
        });

        // Record cost change in accounting
        if (isCostUpdate && data.cost != null) {
          const costDifference = Number(data.cost) - (Number(existing.cost) || 0);
          if (costDifference !== 0) {
            const workOrderCostAccountId = await AccountingService.getAccountId(tx, '5201', tenantId); // RENT_EXPENSE (using as work order expense)
            const cashAccountId = await AccountingService.getAccountId(tx, '1101', tenantId); // CASH

            const journalEntry = await tx.journalEntry.create({
              data: {
                date: new Date(),
                description: `Work Order Cost Adjustment: ${updated.vehicle.make} ${updated.vehicle.model}`,
                type: 'EXPENSE',
                amount: Math.abs(costDifference),
                createdById: payload.userId,
                tenantId,
              },
            });

            if (costDifference > 0) {
              await tx.journalEntryLine.create({
                data: { journalEntryId: journalEntry.id, accountId: workOrderCostAccountId, debit: costDifference, credit: 0, tenantId },
              });
              await tx.journalEntryLine.create({
                data: { journalEntryId: journalEntry.id, accountId: cashAccountId, debit: 0, credit: costDifference, tenantId },
              });
            } else {
              await tx.journalEntryLine.create({
                data: { journalEntryId: journalEntry.id, accountId: workOrderCostAccountId, debit: 0, credit: Math.abs(costDifference), tenantId },
              });
              await tx.journalEntryLine.create({
                data: { journalEntryId: journalEntry.id, accountId: cashAccountId, debit: Math.abs(costDifference), credit: 0, tenantId },
              });
            }
          }
        }

        if (isCompleting) {
          try {
            await WorkOrderService.completeWorkOrder(tx, id, tenantId, payload.userId, updated);
          } catch (err) {
            logger.error('Work order completion side-effects failed, rolling back', err);
            throw err;
          }
        }

        if (isCancelling) {
          try {
            // F-052: Stock is only deducted at completion time (complete-and-pay),
            // NOT at add-time. Since cancellation can only happen before completion,
            // stock was never deducted — so there is nothing to restore.
            // No reversal journal entry is needed either (COGS was never recorded).
            //
            // If in the future stock deduction moves to add-time, this block must
            // be updated to increment stock and reverse the COGS entry.
            logger.info('Work order cancelled — no stock or accounting reversal needed (deferred model)', { workOrderId: id });
          } catch (err) {
            logger.error('Work order cancellation processing failed', err);
          }
        }

        return updated;
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        action: 'update',
        entity: 'WorkOrder',
        entityId: id,
        oldValue: { status: existing.status, cost: existing.cost } as Record<string, unknown>,
        newValue: data as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      // Fire-and-forget WhatsApp notification on status changes
      const eventMap: Record<string, 'work_order_started' | 'work_order_cancelled' | 'work_order_completed'> = {
        in_progress: 'work_order_started',
        cancelled: 'work_order_cancelled',
        completed: 'work_order_completed',
      };

      const customer = workOrder.vehicle?.customer;
      if (data.status && eventMap[data.status] && customer?.phone) {
        const event = eventMap[data.status];
        buildMessage(event, {
          name: customer.name,
          model: workOrder.vehicle?.model ?? '',
          work: workOrder.description,
          cost: workOrder.cost ? `${workOrder.cost}` : undefined,
        }).then((message) => {
          if (message) {
            sendWhatsAppMessageViaService(customer.phone!, message).catch((err) => {
              logger.warn('Work order WhatsApp status notification failed', { workOrderId: id, error: err instanceof Error ? err.message : String(err) });
            });
          }
        });
      }

      // Fire-and-forget WhatsApp notification on edit (description or cost changed)
      const isEdit = (data.description && data.description !== existing.description) ||
                     (data.cost !== undefined && data.cost !== Number(existing.cost));
      if (isEdit && !data.status && customer?.phone) {
        buildMessage('work_order_updated', {
          name: customer.name,
          model: workOrder.vehicle?.model ?? '',
          work: data.description ?? workOrder.description,
          cost: data.cost !== undefined ? `${data.cost}` : (workOrder.cost ? `${workOrder.cost}` : undefined),
        }).then((message) => {
          if (message) {
            sendWhatsAppMessageViaService(customer.phone!, message).catch((err) => {
              logger.warn('Work order WhatsApp edit notification failed', { workOrderId: id, error: err instanceof Error ? err.message : String(err) });
            });
          }
        });
      }

      return withSecurityHeaders(NextResponse.json({ success: true, data: { workOrder } }));
    });
  } catch (error) {
    logger.error('Work order PATCH error', error);
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;

      const existing = await prisma.workOrder.findFirst({ where: { id, isDeleted: false } });
      if (!existing) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Work order not found' }, { status: 404 }));
      }

      await prisma.workOrder.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      const { ipAddress, userAgent } = getClientInfo(req);
      await logAudit({
        action: 'delete',
        entity: 'WorkOrder',
        entityId: id,
        oldValue: { status: existing.status } as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      return withSecurityHeaders(NextResponse.json({ success: true }));
    });
  } catch (error) {
    logger.error('Work order DELETE error', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
  }
}
