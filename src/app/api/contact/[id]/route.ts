import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req);
    const { id } = await params;
    await prisma.contactMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Invalid token')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
