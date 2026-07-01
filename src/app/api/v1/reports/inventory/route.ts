import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { exportToExcel } from '@/lib/export-excel';

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { searchParams } = new URL(req.url);
      const format = searchParams.get('format') || 'json';
      const reportType = searchParams.get('type') || 'summary';

      const products = await prisma.product.findMany({
        where: { isDeleted: false },
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
          available: true,
        },
        orderBy: { name: 'asc' },
      });

      if (reportType === 'low_stock') {
        const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
        if (format === 'excel') {
          const rows = lowStock.map((p) => ({
            'Name': p.name,
            'Barcode': p.barcode || '—',
            'Category': p.category,
            'Stock': p.stock,
            'Reorder Point': p.lowStockThreshold,
            'Shortfall': Math.max(0, p.lowStockThreshold - p.stock),
            'Price': Number(p.price),
            'Supplier Reorder Qty': Math.ceil(p.lowStockThreshold * 2 - p.stock),
          }));
          const buffer = exportToExcel(rows, 'low-stock', 'Low Stock');
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': 'attachment; filename="low-stock.xlsx"',
            },
          });
        }
        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: {
            count: lowStock.length,
            products: lowStock.map((p) => ({
              ...p,
              price: Number(p.price),
              costPrice: Number(p.costPrice || 0),
              shortfall: Math.max(0, p.lowStockThreshold - p.stock),
            })),
          },
        }));
      }

      if (reportType === 'stock_value') {
        const byCategory = new Map<string, { count: number; stockValue: number; retailValue: number }>();
        for (const p of products) {
          const cat = p.category || 'Uncategorized';
          const entry = byCategory.get(cat) || { count: 0, stockValue: 0, retailValue: 0 };
          entry.count += 1;
          entry.stockValue += Number(p.costPrice || 0) * p.stock;
          entry.retailValue += Number(p.price) * p.stock;
          byCategory.set(cat, entry);
        }
        const totalStockValue = products.reduce((s, p) => s + Number(p.costPrice || 0) * p.stock, 0);
        const totalRetailValue = products.reduce((s, p) => s + Number(p.price) * p.stock, 0);
        return withSecurityHeaders(NextResponse.json({
          success: true,
          data: {
            totalProducts: products.length,
            totalStockValue: Math.round(totalStockValue * 100) / 100,
            totalRetailValue: Math.round(totalRetailValue * 100) / 100,
            potentialProfit: Math.round((totalRetailValue - totalStockValue) * 100) / 100,
            byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({
              category,
              ...data,
              stockValue: Math.round(data.stockValue * 100) / 100,
              retailValue: Math.round(data.retailValue * 100) / 100,
            })),
          },
        }));
      }

      // Default: summary
      const totalProducts = products.length;
      const totalStock = products.reduce((s, p) => s + p.stock, 0);
      const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;
      const outOfStockCount = products.filter((p) => p.stock === 0).length;
      const totalStockValue = products.reduce((s, p) => s + Number(p.costPrice || 0) * p.stock, 0);

      if (format === 'excel') {
        const rows = products.map((p) => ({
          'Name': p.name,
          'Barcode': p.barcode || '—',
          'Category': p.category,
          'Stock': p.stock,
          'Reorder Point': p.lowStockThreshold,
          'Status': p.stock === 0 ? 'Out of Stock' : p.stock <= p.lowStockThreshold ? 'Low Stock' : 'OK',
          'Price': Number(p.price),
          'Cost': Number(p.costPrice || 0),
          'Stock Value': Number(p.costPrice || 0) * p.stock,
        }));
        const buffer = exportToExcel(rows, 'stock-summary', 'Stock');
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="stock-summary.xlsx"',
          },
        });
      }

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          totalProducts,
          totalStock,
          lowStockCount,
          outOfStockCount,
          totalStockValue: Math.round(totalStockValue * 100) / 100,
          products: products.map((p) => ({
            ...p,
            price: Number(p.price),
            costPrice: Number(p.costPrice || 0),
            status: p.stock === 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'ok',
          })),
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
