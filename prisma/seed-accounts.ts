import { prisma } from '../src/lib/prisma';
import { DEFAULT_TENANT_ID } from '../src/lib/tenant-context';

interface AccountDef {
  code: string;
  name: string;
  nameAr: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  children?: AccountDef[];
}

const CHART_OF_ACCOUNTS: AccountDef[] = [
  {
    code: '1000',
    name: 'Assets',
    nameAr: 'الأصول',
    type: 'asset',
    children: [
      { code: '1100', name: 'Current Assets', nameAr: 'الأصول المتداولة', type: 'asset' },
      { code: '1101', name: 'Cash', nameAr: 'النقدية', type: 'asset' },
      { code: '1102', name: 'Bank Accounts', nameAr: 'الحسابات البنكية', type: 'asset' },
      { code: '1103', name: 'Accounts Receivable', nameAr: 'حسابات مدينة', type: 'asset' },
      { code: '1104', name: 'Inventory', nameAr: 'المخزون', type: 'asset' },
      { code: '1200', name: 'Fixed Assets', nameAr: 'الأصول الثابتة', type: 'asset' },
      { code: '1201', name: 'Equipment', nameAr: 'المعدات', type: 'asset' },
      { code: '1202', name: 'Vehicles', nameAr: 'المركبات', type: 'asset' },
    ],
  },
  {
    code: '2000',
    name: 'Liabilities',
    nameAr: 'الخصوم',
    type: 'liability',
    children: [
      { code: '2100', name: 'Current Liabilities', nameAr: 'الخصوم المتداولة', type: 'liability' },
      { code: '2101', name: 'Accounts Payable', nameAr: 'حسابات دائنة', type: 'liability' },
      { code: '2102', name: 'Taxes Payable', nameAr: 'ضرائب مستحقة', type: 'liability' },
      { code: '2103', name: 'Accrued Expenses', nameAr: 'مصروفات مستحقة', type: 'liability' },
    ],
  },
  {
    code: '3000',
    name: 'Equity',
    nameAr: 'حقوق الملكية',
    type: 'equity',
    children: [
      { code: '3100', name: 'Owner Capital', nameAr: 'رأس المال', type: 'equity' },
      { code: '3200', name: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', type: 'equity' },
    ],
  },
  {
    code: '4000',
    name: 'Revenue',
    nameAr: 'الإيرادات',
    type: 'revenue',
    children: [
      { code: '4100', name: 'Sales Revenue', nameAr: 'إيرادات المبيعات', type: 'revenue' },
      { code: '4101', name: 'Parts Sales', nameAr: 'مبيعات قطع الغيار', type: 'revenue' },
      { code: '4102', name: 'Service Revenue', nameAr: 'إيرادات الخدمات', type: 'revenue' },
      { code: '4200', name: 'Other Revenue', nameAr: 'إيرادات أخرى', type: 'revenue' },
    ],
  },
  {
    code: '5000',
    name: 'Expenses',
    nameAr: 'المصروفات',
    type: 'expense',
    children: [
      { code: '5100', name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', type: 'expense' },
      { code: '5200', name: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', type: 'expense' },
      { code: '5201', name: 'Salaries & Wages', nameAr: 'الرواتب والأجور', type: 'expense' },
      { code: '5202', name: 'Rent', nameAr: 'الإيجار', type: 'expense' },
      { code: '5203', name: 'Utilities', nameAr: 'المرافق', type: 'expense' },
      { code: '5204', name: 'Marketing', nameAr: 'التسويق', type: 'expense' },
      { code: '5300', name: 'Other Expenses', nameAr: 'مصروفات أخرى', type: 'expense' },
    ],
  },
];

async function seedAccounts() {
  console.log('Seeding Chart of Accounts...');

  for (const group of CHART_OF_ACCOUNTS) {
    const parent = await prisma.account.upsert({
      where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: group.code } },
      update: { name: group.name, nameAr: group.nameAr },
      create: {
        code: group.code,
        name: group.name,
        nameAr: group.nameAr,
        type: group.type,
        tenantId: DEFAULT_TENANT_ID,
      },
    });

    for (const child of (group.children || [])) {
      await prisma.account.upsert({
        where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: child.code } },
        update: { name: child.name, nameAr: child.nameAr, parentId: parent.id },
        create: {
          code: child.code,
          name: child.name,
          nameAr: child.nameAr,
          type: child.type,
          parentId: parent.id,
          tenantId: DEFAULT_TENANT_ID,
        },
      });
    }
  }

  console.log('Chart of Accounts seeded successfully');
}

seedAccounts()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
