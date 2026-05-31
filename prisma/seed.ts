import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await hashPassword('admin123'),
        role: 'admin',
      },
    });
    console.log('Admin user created: admin / admin123');
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
