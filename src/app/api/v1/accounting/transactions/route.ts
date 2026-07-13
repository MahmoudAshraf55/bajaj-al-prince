import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

// Expand a date-only string (YYYY-MM-DD) to the start/end of the local day so
// that range queries capture the full day instead of a zero-width window (Issue 8).
function parseRangeDate(val: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return endOfDay ? new Date(`${val}T23:59:59.999`) : new Date(`${val}T00:00:00`);
  }
  return new Date(val);
}

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    if (!user) return withSecurityHeaders(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const skip = (page - 1) * limit;

    const fromDate = from ? parseRangeDate(from, false) : new Date(new Date().setHours(0, 0, 0, 0));
    const toDate = to ? parseRangeDate(to, true) : new Date(new Date().setHours(23, 59, 59, 999));

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Invalid date range' }, { status: 400 }));
    }

    try {
      const journalEntries = await prisma.journalEntry.findMany({
        where: { date: { gte: fromDate, lte: toDate }, isDeleted: false },
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          referenceType: true,
          referenceId: true,
          referenceNumber: true,
          category: true,
          paymentMethod: true,
          date: true,
          createdById: true,
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      });

      // Get total count for pagination
      const total = await prisma.journalEntry.count({
        where: { date: { gte: fromDate, lte: toDate }, isDeleted: false },
      });

      const transactions = journalEntries.map((je) => ({
        id: je.id,
        type: je.type,
        amount: Number(je.amount),
        description: je.description || '',
        referenceNumber: je.referenceNumber,
        referenceType: je.referenceType || 'journal_entry',
        referenceId: je.referenceId || je.id,
        category: je.category,
        paymentMethod: je.paymentMethod,
        date: je.date.toISOString(),
        createdById: je.createdById,
        items: [] as unknown[],
        discount: 0,
        tax: 0,
      }));

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: transactions,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      }));
    } catch (err) {
      console.error('Accounting transactions error:', err);
      return withSecurityHeaders(NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 }));
    }
  });
}
