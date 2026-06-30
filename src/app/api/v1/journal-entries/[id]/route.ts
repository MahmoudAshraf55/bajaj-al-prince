import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;
      const entry = await prisma.journalEntry.findFirst({
        where: { id },
        include: {
          lines: {
            include: { account: { select: { id: true, code: true, name: true, nameAr: true, type: true } } },
            orderBy: { debit: 'desc' },
          },
          createdBy: { select: { id: true, username: true } },
        },
      });
      if (!entry) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 }));
      }
      return withSecurityHeaders(NextResponse.json({ success: true, data: { entry } }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
