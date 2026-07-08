import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { exportToExcel } from '@/lib/export-excel';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const category = searchParams.get('category');
      const lowStock = searchParams.get('lowStock') === 'true';

      const where: Record<string, unknown> = { isDeleted: false };
      if (category) where.category = category;
      if (lowStock) where.stock = { lte: 5 };

      const products = await prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          barcode: true,
          sku: true,
          category: true,
          price: true,
          costPrice: true,
          stock: true,
          lowStockThreshold: true,
          taxExempt: true,
          taxRate: true,
          available: true,
          createdAt: true,
        },
      });

      const rows = products.map((p) => ({
        'Name': p.name,
        'Barcode': p.barcode || '—',
        'SKU': p.sku || '—',
        'Category': p.category,
        'Price (EGP)': Number(p.price),
        'Cost (EGP)': Number(p.costPrice || 0),
        'Stock': p.stock,
        'Reorder Point': p.lowStockThreshold ?? 5,
        'Status': p.available ? 'Active' : 'Inactive',
        'Tax Exempt': p.taxExempt ? 'Yes' : 'No',
        'Tax Rate': p.taxRate != null ? Number(p.taxRate) : 14,
        'Stock Value': Number(p.costPrice || 0) * p.stock,
        'Created': new Date(p.createdAt).toLocaleDateString(),
      }));

      const buffer = exportToExcel(rows, 'products', 'Products');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="products.xlsx"',
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status });
  }
}
