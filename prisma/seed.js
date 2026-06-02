const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_INITIAL_PASSWORD environment variable is required');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await bcrypt.hash(adminPassword, 12),
        role: 'admin',
      },
    });
    console.log('Admin user created');
  } else {
    console.log('Admin user already exists');
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        { name: 'Bajaj Pulsar 180', category: 'Motorcycles', price: 45000, stock: 5, description: 'High-performance street bike with advanced features.', available: true },
        { name: 'Bajaj Boxer 150', category: 'Motorcycles', price: 32000, stock: 8, description: 'Reliable commuter motorcycle with excellent fuel economy.', available: true },
        { name: 'Engine Oil 4T', category: 'Spare Parts', price: 180, stock: 50, description: 'Premium 4-stroke engine oil for optimal performance.', available: true },
        { name: 'Brake Pads Set', category: 'Spare Parts', price: 350, stock: 30, description: 'High-quality brake pads for enhanced safety.', available: true },
        { name: 'Riding Helmet', category: 'Accessories', price: 1200, stock: 15, description: 'DOT-certified full-face helmet with ventilation.', available: true },
        { name: 'Phone Mount', category: 'Accessories', price: 280, stock: 20, description: 'Universal motorcycle phone holder with shock absorption.', available: true },
      ],
    });
    console.log('Products seeded');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
