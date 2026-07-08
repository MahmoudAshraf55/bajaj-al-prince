import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { AccountingService } from '@/services/AccountingService';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const asOfDate = searchParams.get('asOfDate');

      const balanceSheet = await prisma.$transaction(async (tx) => {
        return await AccountingService.getBalanceSheet(
          tx,
          asOfDate ? new Date(asOfDate) : undefined
        );
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: balanceSheet,
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
