import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(5).max(30),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(req, 'contact');
  if (!limit.allowed) return limit.response!;

  try {
    const body = await req.json();
    const data = contactSchema.parse(body);

    const message = await prisma.contactMessage.create({
      data,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: (error as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Invalid token')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
