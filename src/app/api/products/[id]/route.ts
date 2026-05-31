import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const productUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  category: z.string().min(1).max(100).optional(),
  image: z.string().max(500).optional().nullable(),
  available: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const data = productUpdateSchema.parse(body);
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json({ success: true, product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
