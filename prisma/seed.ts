import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_INITIAL_PASSWORD environment variable is required');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await hashPassword(adminPassword),
        role: 'admin',
      },
    });
    console.log('Admin user created');
  } else {
    console.log('Admin user already exists');
  }

  // Seed default Bajaj models
  const defaultModels = [
    'Bajaj Pulsar N160',
    'Bajaj Pulsar N250',
    'Bajaj Dominar 400',
    'Bajaj Avenger 220',
    'Bajaj Discover 125',
    'Bajaj Pulsar 180',
    'Bajaj Pulsar NS160',
    'Bajaj Boxer 150',
  ];

  for (const name of defaultModels) {
    await prisma.vehicleModel.upsert({
      where: { name },
      update: {},
      create: { name, make: 'Bajaj' },
    });
  }
  console.log('Default vehicle models seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
