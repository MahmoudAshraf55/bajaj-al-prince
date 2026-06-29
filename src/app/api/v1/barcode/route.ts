import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { lookupProduct, logScan } from '@/lib/barcode-engine';
import { withSecurityHeaders } from '@/lib/security';
import { z } from 'zod';

const scanSchema = z.object({
  barcode: z.string().min(1).max(100),
  source: z.enum(['HH400', 'MobileCamera', 'Webcam']).default('HH400'),
  deviceName: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const limit = await checkRateLimit(req, 'admin');
  if (!limit.allowed) return withSecurityHeaders(limit.response!);

  try {
    return await withRole(req, ['admin', 'staff'], async (payload) => {
      const body = await req.json();
      const data = scanSchema.parse(body);

      const result = await lookupProduct(data.barcode);

      if (result.found && result.product) {
        await logScan({
          barcode: data.barcode,
          productId: result.product.id,
          source: data.source as 'HH400' | 'MobileCamera' | 'Webcam',
          status: 'success',
          userId: payload.userId,
          deviceName: data.deviceName,
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        });
      } else {
        await logScan({
          barcode: data.barcode,
          source: data.source as 'HH400' | 'MobileCamera' | 'Webcam',
          status: 'not_found',
          userId: payload.userId,
          deviceName: data.deviceName,
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        });
      }

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          found: result.found,
          product: result.product ?? null,
          message: result.message ?? null,
        },
      }));
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withSecurityHeaders(NextResponse.json({ success: false, errors: error.issues }, { status: 400 }));
    }
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : 401;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
