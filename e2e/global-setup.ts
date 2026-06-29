import { chromium, FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Unlock admin user in case previous test runs locked the account
  const prisma = new PrismaClient();
  try {
    await prisma.user.updateMany({
      where: { username: 'admin' },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    console.log('[global-setup] Admin user unlocked successfully');
  } catch (e) {
    console.error('[global-setup] Failed to unlock admin user:', e);
  }

  // Clean up stale test bookings for the next 7 days so the booking test can reuse the slot
  try {
    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + 7);
    const dateStr = target.toISOString().split('T')[0];
    const result = await prisma.booking.deleteMany({
      where: { date: dateStr, time: '10:00' },
    });
    console.log(`[global-setup] Cleaned ${result.count} bookings for ${dateStr} 10:00`);
  } catch (e) {
    console.error('[global-setup] Failed to clean bookings:', e);
  } finally {
    await prisma.$disconnect();
  }

  await browser.close();
}
