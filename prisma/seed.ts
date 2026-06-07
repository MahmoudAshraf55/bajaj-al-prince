import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';

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

  // Seed default WhatsApp message templates
  const defaultTemplates = [
    { event: 'booking_created', message: 'مرحباً {{name}}، تم استلام حجزك في مركز باجاج الأمير.\nالموديل: {{model}}\nالتاريخ: {{date}}\nالوقت: {{time}}\nنتطلع لخدمتك! 🏍️' },
    { event: 'booking_accepted', message: 'مرحباً {{name}}، تم قبول حجزك في مركز باجاج الأمير.\nالموديل: {{model}}\nالتاريخ: {{date}}\nالوقت: {{time}}\nننتظرك! 🏍️' },
    { event: 'booking_rejected', message: 'مرحباً {{name}}، نعتذر، تم رفض حجزك في مركز باجاج الأمير.\nالموديل: {{model}}\nيرجى التواصل معنا لإعادة جدولة الموعد.' },
    { event: 'booking_completed', message: 'مرحباً {{name}}، تم إنجاز صيانة {{model}} بنجاح في مركز باجاج الأمير. شكراً لثقتك! 🏍️✅' },
    { event: 'issue_changed', message: 'مرحباً {{name}}، تم تحديث وصف المشكلة لحجزك في مركز باجاج الأمير.\nالمشكلة الجديدة: {{issue}}' },
    { event: 'vehicle_added', message: 'مرحباً {{name}}، تم إضافة مركبة جديدة لملفك في مركز باجاج الأمير.\nالماركة: {{make}}\nالموديل: {{model}}\nنتطلع لخدمتك! 🏍️' },
  ];

  for (const tmpl of defaultTemplates) {
    await prisma.whatsAppMessageTemplate.upsert({
      where: { event: tmpl.event },
      update: {},
      create: { event: tmpl.event, message: tmpl.message, isActive: true },
    });
  }
  console.log('Default WhatsApp templates seeded');

  // Seed default reminder schedules
  const defaultSchedules = [
    { name: 'صيانة دورية', intervalDays: 30, message: 'مرحباً {{name}}، نود تذكيرك بموعد صيانة {{model}} في مركز باجاج الأمير. نتطلع لخدمتك قريباً! 🏍️', isActive: true },
    { name: 'متابعة', intervalDays: 7, message: 'مرحباً {{name}}، نأمل أن صيانة {{model}} نالت إعجابك في مركز باجاج الأمير. نحن هنا دائماً لخدمتك! 🏍️', isActive: true },
    { name: 'عرض خاص', intervalDays: 0, message: 'مرحباً {{name}}، لدينا عرض خاص على قطع الغيار لـ {{model}} في مركز باجاج الأمير. لا تفوت الفرصة! 🏍️💰', isActive: false },
  ];

  for (const sch of defaultSchedules) {
    const existing = await prisma.reminderSchedule.findFirst({ where: { name: sch.name } });
    if (!existing) {
      await prisma.reminderSchedule.create({ data: sch });
    }
  }
  console.log('Default reminder schedules seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
