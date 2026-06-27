import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizedString } from '@/lib/sanitize';
import { logAudit, getClientInfo } from '@/lib/audit';
import { z } from 'zod';
import { withSecurityHeaders } from '@/lib/security';
import { Prisma } from '@prisma/client';

const invoiceItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const createInvoiceSchema = z.object({
  type: z.enum(['sale', 'purchase', 'return']).default('sale'),
  items: z.array(invoiceItemSchema).min(1),
  discount: z.number().min(0).default(0),
  paid: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'card', 'transfer']).optional(),
  notes: sanitizedString(z.string().max(1000)).optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  customerName: sanitizedString(z.string().max(200)).optional().nullable(),
});

async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-${dateStr}-`;
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  let nextSeq = 1;
  if (last) {
    const parts = last.number.split('-');
    nextSeq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin', 'staff']);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Prisma.InvoiceWhereInput = {};
    if (type) where.type = type as 'sale' | 'purchase' | 'return';
    if (status) where.status = status as 'draft' | 'confirmed' | 'cancelled';
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, createdBy: { select: { id: true, username: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);

    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        invoices: invoices.map((inv) => ({
          ...inv,
          subtotal: Number(inv.subtotal),
          taxTotal: Number(inv.taxTotal),
          discount: Number(inv.discount),
          total: Number(inv.total),
          paid: Number(inv.paid),
          change: Number(inv.change),
          items: inv.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            costPrice: Number(item.costPrice),
            total: Number(item.total),
          })),
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    const payload = await requireRole(req, ['admin', 'staff']);
    const body = await req.json();
    const data = createInvoiceSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isDeleted: false },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const itemsData: {
        productId: string;
        barcode: string | null;
        productName: string;
        unitPrice: Prisma.Decimal;
        costPrice: Prisma.Decimal;
        quantity: number;
        total: Prisma.Decimal;
      }[] = [];

      for (const item of data.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        if (product.stock < item.quantity && data.type !== 'purchase') {
          throw new Error(`Insufficient stock for ${product.name}: available ${product.stock}, requested ${item.quantity}`);
        }

        const unitPrice = new Prisma.Decimal(Number(product.price));
        const costPrice = new Prisma.Decimal(Number(product.costPrice || 0));
        const total = unitPrice.times(item.quantity);

        itemsData.push({
          productId: product.id,
          barcode: product.barcode,
          productName: product.name,
          unitPrice,
          costPrice,
          quantity: item.quantity,
          total,
        });

        const stockChange = data.type === 'purchase' ? item.quantity : -item.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: stockChange } },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: data.type === 'purchase' ? 'in' : 'out' as 'in' | 'out',
            quantity: item.quantity,
            reference: 'invoice',
            notes: `Invoice ${data.type === 'purchase' ? 'purchase' : 'sale'}`,
            createdById: payload.userId,
          },
        });
      }

      const subtotal = itemsData.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));
      const discount = new Prisma.Decimal(data.discount);

      let taxTotal = new Prisma.Decimal(0);
      for (let i = 0; i < data.items.length; i++) {
        const product = productMap.get(data.items[i].productId);
        if (!product) continue;
        if (product.taxExempt) continue;
        const rate = product.taxRate != null
          ? new Prisma.Decimal(Number(product.taxRate)).div(100)
          : new Prisma.Decimal(0.14);
        const itemTax = itemsData[i].total.times(rate);
        taxTotal = taxTotal.plus(itemTax);
      }

      const afterDiscount = subtotal.minus(discount);
      const total = afterDiscount.gte(0) ? afterDiscount.plus(taxTotal) : new Prisma.Decimal(0);
      const paid = new Prisma.Decimal(data.paid);
      const change = paid.gte(total) ? paid.minus(total) : new Prisma.Decimal(0);

      const invoice = await tx.invoice.create({
        data: {
          number: await generateInvoiceNumber(),
          type: data.type,
          subtotal,
          taxTotal,
          discount,
          total,
          paid,
          change,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          customerId: data.customerId,
          customerName: data.customerName,
          createdById: payload.userId,
          status: 'confirmed',
          items: {
            create: itemsData,
          },
        },
        include: { items: true },
      });

      const jeType = data.type === 'sale' ? 'SALE' as const : data.type === 'return' ? 'RETURN' as const : 'PURCHASE' as const;
      await tx.journalEntry.create({
        data: {
          type: jeType,
          amount: total,
          description: `Invoice ${invoice.number}`,
          referenceType: 'invoice',
          referenceId: invoice.id,
          referenceNumber: invoice.number,
          paymentMethod: data.paymentMethod,
          date: new Date(),
          createdById: payload.userId,
        },
      });

      return invoice;
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: payload.userId,
      action: 'create',
      entity: 'Invoice',
      entityId: result.id,
      newValue: { number: result.number, itemsCount: data.items.length, total: Number(result.total) } as Record<string, unknown>,
      ipAddress,
      userAgent,
    });

    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        invoice: {
          ...result,
          subtotal: Number(result.subtotal),
          taxTotal: Number(result.taxTotal),
          discount: Number(result.discount),
          total: Number(result.total),
          paid: Number(result.paid),
          change: Number(result.change),
          items: result.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            costPrice: Number(item.costPrice),
            total: Number(item.total),
          })),
        },
      },
    }, { status: 201 }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message.startsWith('Insufficient') || message.startsWith('Product not found') ? 400 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
