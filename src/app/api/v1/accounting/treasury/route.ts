import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { parseRangeDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    if (!user) return withSecurityHeaders(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const fromDate = from ? parseRangeDate(from, false) : new Date(new Date().setHours(0, 0, 0, 0));
    const toDate = to ? parseRangeDate(to, true) : new Date(new Date().setHours(23, 59, 59, 999));

    try {
      // 1. Get all relevant Journal Entries (The source of truth for cash flow)
      const journalEntries = await prisma.journalEntry.findMany({
        where: {
          type: { in: ['SALE', 'RETURN'] },
          isDeleted: false,
          date: { gte: fromDate, lte: toDate },
        },
        select: {
          type: true,
          amount: true,
          paymentMethod: true,
          referenceId: true,
        },
      });

      // 2. Aggregate data
      let todaySales = 0;
      let todayCount = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let transferTotal = 0;
      let todayDiscount = 0;
      let todayTax = 0;

      // Extract invoice IDs to get tax/discount breakdown
      const invoiceIds = journalEntries
        .filter(je => je.referenceId)
        .map(je => je.referenceId as string);

      const invoices = await prisma.invoice.findMany({
        where: {
          id: { in: invoiceIds },
          isDeleted: false,
        },
        select: {
          id: true,
          type: true,
          taxTotal: true,
          discount: true,
        },
      });

      const invoiceMap = new Map(invoices.map(inv => [inv.id, inv]));

      for (const je of journalEntries) {
        const amount = Number(je.amount);
        const mult = je.type === 'SALE' ? 1 : -1;
        
        if (je.type === 'SALE') todayCount++;
        // We don't decrement count for returns in the "count" view usually, 
        // but for treasury stats it might be useful. POS usually shows total invoice count.

        if (je.paymentMethod === 'cash') cashTotal += (amount * mult);
        else if (je.paymentMethod === 'card') cardTotal += (amount * mult);
        else if (je.paymentMethod === 'transfer') transferTotal += (amount * mult);
        
        todaySales += (amount * mult);

        // Add tax/discount if this JE is linked to an invoice
        if (je.referenceId) {
          const inv = invoiceMap.get(je.referenceId);
          if (inv) {
            todayDiscount += (Number(inv.discount) * mult);
            todayTax += (Number(inv.taxTotal) * mult);
          }
        }
      }

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          todaySales,
          todayCount,
          cashTotal,
          cardTotal,
          transferTotal,
          todayDiscount,
          todayTax,
        },
      }));
    } catch (error) {
      console.error('[Treasury API] Error:', error);
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 }));
    }
  });
}
