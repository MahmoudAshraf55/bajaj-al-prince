import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().positive(),
  stock: z.number().int().min(0).optional(),
  category: z.string().min(1).max(100),
  image: z.string().max(500).optional().nullable(),
  available: z.boolean().optional(),
});

export async function GET() {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, products });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = productSchema.parse(body);
    const product = await prisma.product.create({ data });
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
