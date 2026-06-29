import { PrismaClient } from '@prisma/client';
import { hashPassword, passwordSchema } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.env.NEW_ADMIN_PASSWORD;
  if (!newPassword) {
    console.error('ERROR: NEW_ADMIN_PASSWORD environment variable is required.');
    console.error('Example: NEW_ADMIN_PASSWORD="Str0ng!Pass" npx tsx scripts/reset-admin-pass.ts');
    process.exit(1);
  }

  const parseResult = passwordSchema.safeParse(newPassword);
  if (!parseResult.success) {
    console.error('ERROR: Password does not meet complexity requirements:');
    for (const issue of parseResult.error.issues) {
      console.error(`  - ${issue.message}`);
    }
    process.exit(1);
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { username: 'admin' },
    data: { password: hashed },
  });
  console.log('Admin password updated successfully.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
