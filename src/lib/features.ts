import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

export interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string | null;
  category: string;
  defaultEnabled: boolean;
}

/**
 * Feature flags registry.
 * Keep this in sync with the `FeatureFlag` table seeded by prisma/seed.ts.
 */
export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: 'whatsapp_module',
    name: 'WhatsApp Module',
    description: 'Enable WhatsApp messaging, templates, and reminders',
    category: 'messaging',
    defaultEnabled: true,
  },
  {
    key: 'advanced_accounting',
    name: 'Advanced Accounting',
    description: 'Enable chart of accounts and double-entry accounting',
    category: 'accounting',
    defaultEnabled: false,
  },
  {
    key: 'supplier_management',
    name: 'Supplier Management',
    description: 'Enable suppliers, purchase orders, and receiving workflow',
    category: 'procurement',
    defaultEnabled: false,
  },
  {
    key: 'ai_product_generator',
    name: 'AI Product Generator',
    description: 'Enable AI-powered product descriptions and images',
    category: 'ai',
    defaultEnabled: false,
  },
  {
    key: 'push_notifications',
    name: 'Push Notifications',
    description: 'Enable web push notifications for alerts',
    category: 'notifications',
    defaultEnabled: false,
  },
  {
    key: 'mixed_payments',
    name: 'Mixed Payments',
    description: 'Allow multiple payment methods on a single invoice',
    category: 'pos',
    defaultEnabled: true,
  },
  {
    key: 'customer_timeline',
    name: 'Customer Timeline',
    description: 'Show chronological activity timeline on customer profiles',
    category: 'crm',
    defaultEnabled: true,
  },
];

interface FeatureCheckOptions {
  tenantId?: string | null;
  role?: string | null;
}

/**
 * Checks whether a feature is enabled.
 * Order of precedence:
 * 1. Tenant-specific override (if tenantId provided)
 * 2. Global feature flag default
 */
export async function isFeatureEnabled(
  key: string,
  options: FeatureCheckOptions = {}
): Promise<boolean> {
  try {
    const tenantId = options.tenantId ?? getTenantId() ?? DEFAULT_TENANT_ID;
    const feature = await prisma.featureFlag.findUnique({
      where: { tenantId_key: { tenantId, key } },
      include: {
        tenantOverrides: { where: { tenantId, isDeleted: false } },
      },
    });

    if (!feature || feature.isDeleted) {
      // Fall back to static registry for flags not yet persisted
      const registryFlag = FEATURE_FLAGS.find((f) => f.key === key);
      return registryFlag?.defaultEnabled ?? false;
    }

    const tenantOverride = feature.tenantOverrides[0];
    if (tenantOverride) {
      return tenantOverride.enabled;
    }

    return feature.defaultEnabled;
  } catch (error) {
    logger.error('Failed to check feature flag', error, { key, tenantId: options.tenantId });
    // Fail closed: disabled on error
    return false;
  }
}

/**
 * Returns all feature flags with their effective state for a given tenant.
 */
export async function getFeatureFlags(
  options: FeatureCheckOptions = {}
): Promise<Array<FeatureFlagDefinition & { enabled: boolean; tenantOverride?: boolean | null }>> {
  try {
    const tenantId = options.tenantId ?? getTenantId() ?? DEFAULT_TENANT_ID;
    const persisted = await prisma.featureFlag.findMany({
      where: { isDeleted: false },
      include: {
        tenantOverrides: { where: { tenantId, isDeleted: false } },
      },
    });

    const persistedKeys = new Set(persisted.map((f) => f.key));

    // Include any flags from registry not yet persisted
    const allFlags = [
      ...persisted,
      ...FEATURE_FLAGS.filter((f) => !persistedKeys.has(f.key)).map((f) => ({
        ...f,
        id: f.key,
        isDeleted: false,
        defaultEnabled: f.defaultEnabled,
        tenantOverrides: [],
      })),
    ];

    return allFlags.map((flag) => {
      const tenantOverride = flag.tenantOverrides?.[0];
      const enabled = tenantOverride ? tenantOverride.enabled : flag.defaultEnabled;
      return {
        key: flag.key,
        name: flag.name,
        description: flag.description,
        category: flag.category,
        defaultEnabled: flag.defaultEnabled,
        enabled,
        tenantOverride: tenantOverride ? tenantOverride.enabled : null,
      };
    });
  } catch (error) {
    logger.error('Failed to fetch feature flags', error, { tenantId: options.tenantId });
    return FEATURE_FLAGS.map((f) => ({ ...f, enabled: f.defaultEnabled, tenantOverride: null }));
  }
}
