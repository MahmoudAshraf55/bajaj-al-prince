import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { PDFDocument, StandardFonts, rgb, type RGB } from 'pdf-lib';

function toNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val);
  return Number(val);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const { id } = await params;

      const order = await prisma.purchaseOrder.findFirst({
        where: { id },
        include: {
          supplier: true,
          createdBy: { select: { id: true, username: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!order) {
        return withSecurityHeaders(NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 }));
      }

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height: pageHeight } = page.getSize();

      let y = pageHeight - 50;
      const leftMargin = 50;
      const rightMargin = width - 50;

      const drawText = (text: string, x: number, yPos: number, opts: { size?: number; font?: typeof font; color?: RGB } = {}) => {
        page.drawText(text, {
          x,
          y: yPos,
          size: opts.size ?? 10,
          font: opts.font ?? font,
          color: opts.color ?? rgb(0.1, 0.1, 0.1),
        });
      };

      const drawLine = (yPos: number, color: RGB = rgb(0.8, 0.8, 0.8)) => {
        page.drawLine({
          start: { x: leftMargin, y: yPos },
          end: { x: rightMargin, y: yPos },
          thickness: 1,
          color,
        });
      };

      // Header
      drawText('PURCHASE ORDER', leftMargin, y, { size: 20, font: bold, color: rgb(0.2, 0.3, 0.7) });
      drawText(`#${order.number}`, leftMargin, y - 22, { size: 14, font: bold });
      y -= 50;

      // box: Supplier Info + Order Info
      const boxY = y;
      page.drawRectangle({
        x: leftMargin,
        y: boxY - 80,
        width: width - 100,
        height: 80,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
        color: rgb(0.97, 0.97, 0.97),
      });

      drawText('Supplier:', leftMargin + 10, boxY - 14, { size: 8, font: bold, color: rgb(0.5, 0.5, 0.5) });
      drawText(order.supplier.name, leftMargin + 10, boxY - 28, { size: 10 });
      if (order.supplier.phone) {
        drawText(`Phone: ${order.supplier.phone}`, leftMargin + 10, boxY - 42, { size: 9, color: rgb(0.4, 0.4, 0.4) });
      }
      if (order.supplier.email) {
        drawText(`Email: ${order.supplier.email}`, leftMargin + 10, boxY - 56, { size: 9, color: rgb(0.4, 0.4, 0.4) });
      }

      const rightColX = rightMargin - 150;
      drawText('Status:', rightColX, boxY - 14, { size: 8, font: bold, color: rgb(0.5, 0.5, 0.5) });
      drawText(order.status.replace(/_/g, ' ').toUpperCase(), rightColX, boxY - 28, { size: 10, font: bold });
      drawText('Date:', rightColX, boxY - 42, { size: 8, font: bold, color: rgb(0.5, 0.5, 0.5) });
      drawText(new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), rightColX, boxY - 56, { size: 9 });

      y = boxY - 100;

      // Items Table Header
      drawLine(y);
      y -= 6;
      drawText('#', leftMargin + 2, y - 10, { size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
      drawText('Product', leftMargin + 20, y - 10, { size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
      drawText('SKU', leftMargin + 200, y - 10, { size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
      drawText('Qty', leftMargin + 280, y - 10, { size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
      drawText('Unit Price', leftMargin + 330, y - 10, { size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
      drawText('Total', rightMargin - 40, y - 10, { size: 8, font: bold, color: rgb(0.3, 0.3, 0.3) });
      y -= 22;
      drawLine(y);

      // Items
      order.items.forEach((item, idx) => {
        if (y < 80) {
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          y = newPage.getSize().height - 50;
        }
        y -= 16;
        drawText(String(idx + 1), leftMargin + 2, y - 8, { size: 9, color: rgb(0.3, 0.3, 0.3) });
        drawText(item.product.name.substring(0, 40), leftMargin + 20, y - 8, { size: 9 });
        drawText(item.product.sku || '-', leftMargin + 200, y - 8, { size: 8, color: rgb(0.4, 0.4, 0.4) });
        drawText(String(item.quantity), leftMargin + 285, y - 8, { size: 9 });
        drawText(toNum(item.unitPrice).toFixed(2), leftMargin + 330, y - 8, { size: 9 });
        drawText(toNum(item.total).toFixed(2), rightMargin - 50, y - 8, { size: 9, font: bold });
      });

      // Totals
      y -= 30;
      drawLine(y);
      y -= 6;

      const totalsX = rightMargin - 150;

      drawText('Subtotal:', totalsX, y - 10, { size: 9, color: rgb(0.4, 0.4, 0.4) });
      drawText(toNum(order.subtotal).toFixed(2), rightMargin - 50, y - 10, { size: 9 });

      if (toNum(order.taxTotal) > 0) {
        y -= 14;
        drawText('Tax:', totalsX, y - 10, { size: 9, color: rgb(0.4, 0.4, 0.4) });
        drawText(toNum(order.taxTotal).toFixed(2), rightMargin - 50, y - 10, { size: 9 });
      }

      if (toNum(order.discount) > 0) {
        y -= 14;
        drawText('Discount:', totalsX, y - 10, { size: 9, color: rgb(0.4, 0.4, 0.4) });
        drawText(`-${toNum(order.discount).toFixed(2)}`, rightMargin - 50, y - 10, { size: 9 });
      }

      y -= 18;
      drawLine(y);
      y -= 6;
      drawText('Grand Total:', totalsX, y - 10, { size: 11, font: bold });
      drawText(toNum(order.total).toFixed(2), rightMargin - 50, y - 10, { size: 11, font: bold });

      // Notes
      if (order.notes) {
        y -= 30;
        drawLine(y);
        y -= 6;
        drawText('Notes:', leftMargin, y - 10, { size: 8, font: bold, color: rgb(0.5, 0.5, 0.5) });
        drawText(order.notes, leftMargin, y - 24, { size: 9, color: rgb(0.4, 0.4, 0.4) });
      }

      // Footer
      drawText(`Created by: ${order.createdBy.username}`, leftMargin, 40, { size: 8, color: rgb(0.6, 0.6, 0.6) });
      drawText(`Generated on: ${new Date().toLocaleString()}`, leftMargin, 28, { size: 8, color: rgb(0.6, 0.6, 0.6) });
      drawText('El Prince Bajaj - Purchase Order', rightMargin - 130, 40, { size: 8, color: rgb(0.6, 0.6, 0.6) });

      const pdfBytes = await pdfDoc.save();

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="PO-${order.number}.pdf"`,
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: message }, { status }));
  }
}
