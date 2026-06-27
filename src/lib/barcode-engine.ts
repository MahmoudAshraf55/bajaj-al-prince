import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ScanSource, ScanStatus } from '@prisma/client';

export interface BarcodeResult {
  found: boolean;
  product?: {
    id: string;
    name: string;
    nameAr: string | null;
    barcode: string | null;
    price: number;
    stock: number;
    image: string | null;
    unit: string;
  };
  message?: string;
}

export async function lookupProduct(barcode: string): Promise<BarcodeResult> {
  try {
    const cleaned = barcode.trim();
    if (!cleaned) {
      return { found: false, message: 'Empty barcode' };
    }

    const product = await prisma.product.findFirst({
      where: {
        barcode: cleaned,
        available: true,
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        barcode: true,
        price: true,
        stock: true,
        image: true,
        unit: true,
      },
    });

    if (!product) {
      return { found: false, message: `No product found for barcode: ${cleaned}` };
    }

    return {
      found: true,
      product: {
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        barcode: product.barcode,
        price: Number(product.price),
        stock: product.stock,
        image: product.image,
        unit: product.unit,
      },
    };
  } catch (error) {
    logger.error('Barcode lookup error', error, { barcode });
    return { found: false, message: 'Internal error during barcode lookup' };
  }
}

export interface ScanLogInput {
  barcode: string;
  productId?: string;
  source: ScanSource;
  status: ScanStatus;
  userId?: string;
  deviceName?: string;
  ipAddress?: string;
}

export async function logScan(input: ScanLogInput): Promise<void> {
  try {
    await prisma.barcodeScanLog.create({
      data: {
        barcode: input.barcode,
        productId: input.productId ?? null,
        source: input.source,
        status: input.status,
        userId: input.userId ?? null,
        deviceName: input.deviceName ?? null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    logger.error('Failed to log barcode scan', error, { barcode: input.barcode });
  }
}

export function parseBarcodeFormat(barcode: string): { format: string; isValid: boolean } {
  const cleaned = barcode.trim();

  if (/^\d{12}$/.test(cleaned)) return { format: 'UPC-A', isValid: true };
  if (/^\d{13}$/.test(cleaned)) return { format: 'EAN-13', isValid: true };
  if (/^\d{8}$/.test(cleaned)) return { format: 'EAN-8', isValid: true };
  if (/^\d{14}$/.test(cleaned)) return { format: 'ITF-14', isValid: true };
  if (/^[A-Za-z0-9\-_]+$/.test(cleaned) && cleaned.length >= 3 && cleaned.length <= 50)
    return { format: 'Code128/Code39', isValid: true };
  if (cleaned.length > 0) return { format: 'Unknown', isValid: false };
  return { format: 'Empty', isValid: false };
}
