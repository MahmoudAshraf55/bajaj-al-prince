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

      const trialBalance = await prisma.$transaction(async (tx) => {
        return await AccountingService.getTrialBalance(
          tx,
          asOfDate ? new Date(asOfDate) : undefined
        );
      });

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: trialBalance,
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Forbidden') {
      return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status: 403 }));
    }
    console.error('Trial balance error:', error);
    return withSecurityHeaders(NextResponse.json({ success: false, error: 'Failed to fetch trial balance' }, { status: 500 }));
  }
}
