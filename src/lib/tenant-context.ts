import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
}

/**
 * AsyncLocalStorage that holds the current request's tenant context.
 * This allows the Prisma client extension to inject tenantId automatically
 * without threading it through every function call.
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId;
}

export function setTenantContext<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ tenantId }, fn);
}

/**
 * Default tenant ID used for seeding, migrations, and fallback scenarios.
 * This MUST match the default tenant seeded by the migration.
 */
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
