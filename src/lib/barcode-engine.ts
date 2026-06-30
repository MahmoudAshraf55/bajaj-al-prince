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
    category: string;
    image: string | null;
    unit: string;
    available: boolean;
  };
  message?: string;
}

export async function lookupProduct(barcode: string): Promise<BarcodeResult> {
  try {
    const cleaned = barcode.trim();
    if (!cleaned) {
      return { found: false, message: 'Empty barcode' };
    }

    const selectFields = {
      id: true, name: true, nameAr: true, barcode: true,
      price: true, stock: true, category: true, image: true,
      unit: true, available: true,
    } as const;

    let product = await prisma.product.findFirst({
      where: { barcode: cleaned, available: true },
      select: selectFields,
    });

    if (!product) {
      product = await prisma.product.findFirst({
        where: { barcode: { startsWith: cleaned }, available: true },
        select: selectFields,
      });
    }

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
        category: product.category,
        image: product.image,
        unit: product.unit,
        available: product.available,
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

export { parseBarcodeFormat } from './barcode-utils';
