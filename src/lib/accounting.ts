import { prisma } from '@/lib/prisma';

/**
 * Ensures there is an explicitly open accounting period covering the given date.
 * Throws if the period is closed/locked or if no period exists at all.
 */
export async function requireOpenPeriod(date?: Date) {
  const targetDate = date || new Date();
  const period = await prisma.accountingPeriod.findFirst({
    where: {
      startDate: { lte: targetDate },
      endDate: { gte: targetDate },
      isDeleted: false,
    },
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
    orderBy: { startDate: 'desc' },
  });

  if (!period) {
    throw new Error(
      `No accounting period exists for ${targetDate.toISOString().slice(0, 10)}. ` +
      `Please create an open accounting period before recording transactions.`
    );
  }

  if (period.status !== 'open') {
    const statusLabel = period.status === 'closed' ? 'مغلقة' : 'مقفلة';
    throw new Error(
      `Cannot modify transactions in period "${period.name}" (${statusLabel}). ` +
      `This period covers ${period.startDate.toISOString().slice(0, 10)} to ${period.endDate.toISOString().slice(0, 10)}. ` +
      `Please reopen the period or choose a different date.`
    );
  }
}
