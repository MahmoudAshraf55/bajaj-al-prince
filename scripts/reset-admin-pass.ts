import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const hashed = await hashPassword('admin123');
  await prisma.user.update({
    where: { username: 'admin' },
    data: { password: hashed },
  });
  console.log('Password updated to admin123');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
