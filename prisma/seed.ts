import { hashPassword } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';
import { PERMISSION_DEFINITIONS, DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';
import { FEATURE_FLAGS } from '../src/lib/features';
import { DEFAULT_TENANT_ID, setTenantContext } from '../src/lib/tenant-context';

async function seed() {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';

  // Ensure the default tenant exists
  await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'Default Tenant',
      slug: 'default',
    },
  });

  const existing = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: await hashPassword(adminPassword),
        role: 'admin',
        tenantId: DEFAULT_TENANT_ID,
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
      where: { tenantId_name: { tenantId: DEFAULT_TENANT_ID, name } },
      update: {},
      create: { name, make: 'Bajaj', tenantId: DEFAULT_TENANT_ID },
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
    { event: 'work_order_created', message: 'مرحباً {{name}}، تم إنشاء أمر صيانة لمركبتك {{model}}.\nالعمل: {{work}}\nالتكلفة: {{cost}}\nسيتم البدء في العمل قريباً. 🏍️🔧' },
    { event: 'work_order_started', message: 'مرحباً {{name}}، تم بدء العمل في أمر الصيانة لمركبتك {{model}}.\nالعمل: {{work}}\nسنقوم بإعلامك عند الانتهاء. 🏍️🔧' },
    { event: 'work_order_cancelled', message: 'مرحباً {{name}}، تم إلغاء أمر الصيانة لمركبتك {{model}}.\nنعتذر عن الإزعاج. يرجى التواصل معنا للمزيد من التفاصيل.' },
    { event: 'work_order_completed', message: 'مرحباً {{name}}، تم إنجاز أمر الصيانة لمركبتك {{model}} بنجاح.\nالعمل: {{work}}\nالتكلفة: {{cost}}\nشكراً لثقتك في مركز باجاج الأمير! 🏍️✅' },
    { event: 'work_order_updated', message: 'مرحباً {{name}}، تم تحديث أمر الصيانة لمركبتك {{model}}.\nالعمل: {{work}}\nالتكلفة: {{cost}}\nلمزيد من المعلومات، يرجى الاتصال بنا.' },
  ];

  for (const tmpl of defaultTemplates) {
    await prisma.whatsAppMessageTemplate.upsert({
      where: { tenantId_event: { tenantId: DEFAULT_TENANT_ID, event: tmpl.event } },
      update: {},
      create: { event: tmpl.event, message: tmpl.message, isActive: true, tenantId: DEFAULT_TENANT_ID },
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
    const existing = await prisma.reminderSchedule.findFirst({ where: { name: sch.name, tenantId: DEFAULT_TENANT_ID } });
    if (!existing) {
      await prisma.reminderSchedule.create({ data: { ...sch, tenantId: DEFAULT_TENANT_ID } });
    }
  }
  console.log('Default reminder schedules seeded');

  // Seed permissions
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: def.key } },
      update: {
        name: def.name,
        description: def.description,
        category: def.category,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        key: def.key,
        name: def.name,
        description: def.description,
        category: def.category,
        tenantId: DEFAULT_TENANT_ID,
      },
    });
  }
  console.log('Default permissions seeded');

  // Seed role-permission mappings
  const allPermissions = await prisma.permission.findMany({ where: { isDeleted: false } });
  const permissionMap = new Map(allPermissions.map((p) => [p.key, p.id]));

  for (const [role, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [keyof typeof DEFAULT_ROLE_PERMISSIONS, string[]][]) {
    for (const key of keys) {
      const permissionId = permissionMap.get(key);
      if (!permissionId) continue;

      const existing = await prisma.rolePermission.findUnique({
        where: {
          role_permissionId: {
            role,
            permissionId,
          },
        },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: { role, permissionId, tenantId: DEFAULT_TENANT_ID },
        });
      } else if (existing.isDeleted) {
        await prisma.rolePermission.update({
          where: { id: existing.id },
          data: { isDeleted: false, deletedAt: null },
        });
      }
    }
  }
  console.log('Default role permissions seeded');

  // Seed feature flags
  for (const def of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { tenantId_key: { tenantId: DEFAULT_TENANT_ID, key: def.key } },
      update: {
        name: def.name,
        description: def.description,
        category: def.category,
        defaultEnabled: def.defaultEnabled,
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        key: def.key,
        name: def.name,
        description: def.description,
        category: def.category,
        defaultEnabled: def.defaultEnabled,
        tenantId: DEFAULT_TENANT_ID,
      },
    });
  }
  console.log('Default feature flags seeded');
}

async function main() {
  await setTenantContext(DEFAULT_TENANT_ID, seed);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
