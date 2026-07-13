import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { AccountingService } from '@/services/AccountingService';

// Expand a date-only string (YYYY-MM-DD) to the start/end of the local day so
// that range queries capture the full day instead of a zero-width window (Issue 8).
function parseRangeDate(val: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return endOfDay ? new Date(`${val}T23:59:59.999`) : new Date(`${val}T00:00:00`);
  }
  return new Date(val);
}

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const fromDate = searchParams.get('fromDate');
      const toDate = searchParams.get('toDate');

      const incomeStatement = await prisma.$transaction(async (tx) => {
        return await AccountingService.getIncomeStatement(
          tx,
          fromDate ? parseRangeDate(fromDate, false) : undefined,
          toDate ? parseRangeDate(toDate, true) : undefined
        );
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: incomeStatement,
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
