import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.log('=== Transactions (last 10) ===');
  for (const t of txs) {
    console.log(`${t.type} | ${t.amount} | ${t.description || '(no desc)'}`);
  }

  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  console.log(`\nTotal income: ${income}`);
  console.log(`Total expense: ${expense}`);
  console.log(`Balance: ${income - expense}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); prisma.$disconnect(); });
