import { prisma } from '../src/lib/prisma';
import { DEFAULT_TENANT_ID } from '../src/lib/tenant-context';
import { ACCOUNT_CODES, getDebitAccountCode, getCreditAccountCode } from '../src/lib/journal';

async function migrateJournalEntryLines() {
  console.log('Migrating existing JournalEntries to double-entry lines...');

  const entries = await prisma.journalEntry.findMany({
    where: { lines: { none: {} } },
    include: { lines: true },
  });

  console.log(`Found ${entries.length} entries without lines`);

  for (const entry of entries) {
    const tenantId = entry.tenantId ?? DEFAULT_TENANT_ID;
    const amount = Number(entry.amount);

    const debitCode = getDebitAccountCode({
      type: entry.type,
      amount,
      paymentMethod: entry.paymentMethod ?? undefined,
      category: entry.category ?? undefined,
    });

    const creditCode = getCreditAccountCode({
      type: entry.type,
      amount,
      paymentMethod: entry.paymentMethod ?? undefined,
      category: entry.category ?? undefined,
    });

    const [debitAccount, creditAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { code: debitCode, OR: [{ tenantId }, { tenantId: DEFAULT_TENANT_ID }] },
        orderBy: { tenantId: 'desc' },
      }),
      prisma.account.findFirst({
        where: { code: creditCode, OR: [{ tenantId }, { tenantId: DEFAULT_TENANT_ID }] },
        orderBy: { tenantId: 'desc' },
      }),
    ]);

    if (!debitAccount || !creditAccount) {
      console.warn(`Skipping entry ${entry.id}: account not found (debit: ${debitCode}, credit: ${creditCode})`);
      continue;
    }

    await prisma.journalEntryLine.createMany({
      data: [
        {
          journalEntryId: entry.id,
          accountId: debitAccount.id,
          debit: amount,
          credit: 0,
          description: entry.description,
          tenantId,
        },
        {
          journalEntryId: entry.id,
          accountId: creditAccount.id,
          debit: 0,
          credit: amount,
          description: entry.description,
          tenantId,
        },
      ],
    });

    // Update the JournalEntry with the account IDs if not set
    if (!entry.debitAccountId || !entry.creditAccountId) {
      await prisma.journalEntry.update({
        where: { id: entry.id },
        data: {
          debitAccountId: entry.debitAccountId ?? debitAccount.id,
          creditAccountId: entry.creditAccountId ?? creditAccount.id,
        },
      });
    }
  }

  console.log(`Migrated ${entries.length} entries successfully`);
}

migrateJournalEntryLines()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
