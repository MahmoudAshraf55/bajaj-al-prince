import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { AccountingService } from '@/services/AccountingService';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const fromDate = searchParams.get('fromDate');
      const toDate = searchParams.get('toDate');

      const incomeStatement = await prisma.$transaction(async (tx) => {
        return await AccountingService.getIncomeStatement(
          tx,
          fromDate ? new Date(fromDate) : undefined,
          toDate ? new Date(toDate) : undefined
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
