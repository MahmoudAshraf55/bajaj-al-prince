import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken({ userId: user.id, username: user.username, role: user.role });
    return NextResponse.json({ success: true, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: (error as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
