import { prisma } from '@/lib/prisma';
import { DEFAULT_TENANT_ID } from '@/lib/tenant-context';
import { ACCOUNT_CODES } from '@/constants/accounting';

const ACCOUNT_NAMES: Record<string, { name: string; nameAr: string; type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }> = {
  [ACCOUNT_CODES.ACCOUNTS_RECEIVABLE]: { name: 'Accounts Receivable', nameAr: 'حسابات مدينة', type: 'asset' },
  [ACCOUNT_CODES.INVENTORY]: { name: 'Inventory', nameAr: 'المخزون', type: 'asset' },
  [ACCOUNT_CODES.COGS]: { name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', type: 'expense' },
  [ACCOUNT_CODES.PARTS_SALES]: { name: 'Parts Sales', nameAr: 'مبيعات قطع الغيار', type: 'revenue' },
  [ACCOUNT_CODES.SERVICE_REVENUE]: { name: 'Service Revenue', nameAr: 'إيرادات الخدمات', type: 'revenue' },
};

type Tx = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class AccountingService {
  static async getAccountId(tx: Tx, code: string, tenantId: string): Promise<string> {
    let acct = await tx.account.findFirst({
      where: { code, OR: [{ tenantId }, { tenantId: DEFAULT_TENANT_ID }] },
      orderBy: { tenantId: 'desc' },
      select: { id: true },
    });

    if (!acct) {
      const info = ACCOUNT_NAMES[code];
      if (!info) throw new Error(`Account code ${code} not found and no fallback info`);
      acct = await tx.account.create({
        data: { code, ...info, tenantId },
        select: { id: true },
      });
    }

    return acct.id;
  }
}
