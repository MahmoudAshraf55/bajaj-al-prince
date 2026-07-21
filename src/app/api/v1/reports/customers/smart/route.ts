import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole } from '@/lib/auth';
import { withSecurityHeaders } from '@/lib/security';
import { exportToExcel } from '@/lib/export-excel';

interface SmartCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalVisits: number;
  totalRevenue: number;
  totalProfit: number;
  avgProfitPerVisit: number;
  recommendation: 'discount_10_labour' | 'free_service' | 'free_wash' | 'discount_5_parts' | null;
  recommendationLabel: string;
  recommendationColor: 'green' | 'blue' | 'cyan' | 'amber' | 'gray';
}

function getRecommendation(totalProfit: number): Pick<SmartCustomer, 'recommendation' | 'recommendationLabel' | 'recommendationColor'> {
  if (totalProfit >= 3500) {
    return {
      recommendation: 'free_service',
      recommendationLabel: 'Free Service',
      recommendationColor: 'green',
    };
  }
  if (totalProfit >= 1500) {
    return {
      recommendation: 'discount_10_labour',
      recommendationLabel: '10% Off Labour',
      recommendationColor: 'blue',
    };
  }
  if (totalProfit >= 500 && totalProfit < 750) {
    return {
      recommendation: 'free_wash',
      recommendationLabel: 'Free Wash',
      recommendationColor: 'amber',
    };
  }
  if (totalProfit >= 750 && totalProfit < 1500) {
    return {
      recommendation: 'discount_5_parts',
      recommendationLabel: '5% Off Parts',
      recommendationColor: 'cyan',
    };
  }
  return {
    recommendation: null,
    recommendationLabel: '—',
    recommendationColor: 'gray',
  };
}

export async function GET(req: NextRequest) {
  try {
    return await withRole(req, ['admin', 'staff'], async () => {
      const customers = await prisma.customer.findMany({
        where: { isDeleted: false },
        include: {
          invoices: {
            where: { type: 'sale', status: 'confirmed', isDeleted: false },
            include: {
              items: {
                where: { isDeleted: false },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      const smart: SmartCustomer[] = [];

      for (const c of customers) {
        let totalRevenue = 0;
        let totalCost = 0;
        const visitCount = c.invoices.length;

        for (const inv of c.invoices) {
          totalRevenue += Number(inv.total);
          for (const item of inv.items) {
            totalCost += Number(item.costPrice) * item.quantity;
          }
        }

        const totalProfit = totalRevenue - totalCost;
        const avgProfitPerVisit = visitCount > 0 ? totalProfit / visitCount : 0;
        const rec = getRecommendation(totalProfit);

        if (visitCount > 0) {
          smart.push({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            totalVisits: visitCount,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalProfit: Math.round(totalProfit * 100) / 100,
            avgProfitPerVisit: Math.round(avgProfitPerVisit * 100) / 100,
            recommendation: rec.recommendation,
            recommendationLabel: rec.recommendationLabel,
            recommendationColor: rec.recommendationColor,
          });
        }
      }

      // Sort by totalProfit desc
      smart.sort((a, b) => b.totalProfit - a.totalProfit);

      const format = new URL(req.url).searchParams.get('format');
      if (format === 'excel') {
        const rows = smart.map((c) => ({
          Name: c.name,
          Phone: c.phone ?? '',
          Visits: c.totalVisits,
          Revenue: c.totalRevenue,
          Profit: c.totalProfit,
          'Avg Profit/Visit': c.avgProfitPerVisit,
          Recommendation: c.recommendationLabel,
        }));
        const buffer = exportToExcel(rows, 'smart-customers', 'Smart Analysis');
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="smart-customers.xlsx"',
          },
        });
      }

      return withSecurityHeaders(NextResponse.json({
        success: true,
        data: {
          count: smart.length,
          customers: smart,
          thresholds: {
            free_service: { min: 3500, label: 'Free Service' },
            discount_10_labour: { min: 1500, label: '10% Off Labour (labour only, not parts)' },
            discount_5_parts: { min: 750, max: 1500, label: '5% Off Parts' },
            free_wash: { min: 500, max: 750, label: 'Free Wash' },
          },
        },
      }));
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return withSecurityHeaders(NextResponse.json({ success: false, error: status === 500 ? 'Internal server error' : message }, { status }));
  }
}
