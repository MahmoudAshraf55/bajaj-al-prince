import { PrismaClient, Prisma } from '@prisma/client';
import { getTenantId, DEFAULT_TENANT_ID } from '@/lib/tenant-context';

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    // Neon free-tier works best with a small connection pool and longer pool timeout
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '5');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '20');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function isCompositeUniqueKey(key: string): boolean {
  // Prisma generates composite unique key names as field1_field2...; tenant-scoped
  // unique keys always include `tenantId` in their name (e.g. tenantId_key).
  return key.includes('tenantId');
}

function isIdOnlyWhere(where: Record<string, unknown>): boolean {
  const keys = Object.keys(where);
  return keys.length === 1 && keys[0] === 'id';
}

/**
 * Inject tenantId into filter-style `where` clauses (findMany, findFirst, count,
 * aggregate, groupBy, updateMany, deleteMany). Also enforces soft-delete filter.
 * Falls back to the default tenant when no explicit context is set so public
 * endpoints and background jobs never write/read across tenant boundaries.
 */
function withTenantFilterWhere<T extends { where?: Record<string, unknown> }>(args: T): T {
  const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;
  return { ...args, where: { ...(args.where ?? {}), tenantId, isDeleted: false } } as T;
}

/**
 * Inject tenantId into unique-style `where` clauses (findUnique, update, delete).
 * Only injects when the query targets a record by its primary key. Composite
 * unique keys already encode the tenant, and single-field unique keys (e.g.
 * username) are globally unique so adding tenantId would conflict with Prisma's
 * input types. Soft-delete filter is intentionally NOT added here because
 * WhereUniqueInput cannot include non-unique filter fields.
 */
function withTenantUniqueWhere<T extends { where?: Record<string, unknown> }>(args: T): T {
  const tenantId = getTenantId();
  // Only scope unique queries when an explicit tenant context exists. Pre-auth
  // routes (login/refresh) and globally-unique lookups (e.g. username) must not
  // have a tenant injected, otherwise id-based updates for the found user fail.
  if (!tenantId) return args;
  if (!args.where) return args;
  if (Object.keys(args.where).some(isCompositeUniqueKey)) return args;
  if (!isIdOnlyWhere(args.where)) return args;
  return { ...args, where: { ...args.where, tenantId } } as T;
}

/**
 * Inject tenantId into create payloads. Works for create and createMany. Falls
 * back to the default tenant when no explicit context is set. Used for creates
 * and the create branch of upsert only — updates never inject tenantId.
 */
function withTenantData<T extends { data?: Record<string, unknown> | Record<string, unknown>[] }>(args: T): T {
  const tenantId = getTenantId() ?? DEFAULT_TENANT_ID;

  if (Array.isArray(args.data)) {
    return { ...args, data: args.data.map((item) => ({ ...item, tenantId })) } as T;
  }

  return { ...args, data: { ...(args.data ?? {}), tenantId } } as T;
}

function withTenantUpdate<T extends { where?: Record<string, unknown>; data?: Record<string, unknown> }>(
  args: T
): T {
  // NOTE: tenantId is intentionally NOT injected into update data. A record's
  // tenantId must never be changed – it is set at creation time and defines
  // the record's ownership boundary. Only the WHERE clause is scoped.
  return withTenantUniqueWhere(args) as T;
}

function withTenantUpdateMany<T extends { where?: Record<string, unknown>; data?: Record<string, unknown> }>(
  args: T
): T {
  return withTenantFilterWhere(args) as T;
}

function withTenantUpsert<T extends { where?: Record<string, unknown>; create?: Record<string, unknown>; update?: Record<string, unknown> }>(
  args: T
): T {
  return {
    ...withTenantUniqueWhere(args),
    create: withTenantData({ data: args.create }).data,
    // tenantId is NOT injected into upsert's update data (same rationale as update)
    update: args.update,
  } as T;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: { db: { url: getDatabaseUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends({
    model: {
      $allModels: {
        softDelete<T>(this: T, where: Record<string, unknown>) {
          const context = Prisma.getExtensionContext(this);
          return (context as unknown as { update: (args: { where: Record<string, unknown>; data: { isDeleted: boolean; deletedAt: Date } }) => Promise<unknown> }).update({
            where,
            data: { isDeleted: true, deletedAt: new Date() },
          });
        },
      },
    },
    query: {
      $allModels: {
        async findUnique({ args, query }) {
          return query(withTenantUniqueWhere(args) as unknown as typeof args);
        },
        async findUniqueOrThrow({ args, query }) {
          return query(withTenantUniqueWhere(args) as unknown as typeof args);
        },
        async findFirst({ args, query }) {
          return query(withTenantFilterWhere(args) as unknown as typeof args);
        },
        async findFirstOrThrow({ args, query }) {
          return query(withTenantFilterWhere(args) as unknown as typeof args);
        },
        async findMany({ args, query }) {
          return query(withTenantFilterWhere(args) as unknown as typeof args);
        },
        async count({ args, query }) {
          return query(withTenantFilterWhere(args) as unknown as typeof args);
        },
        async aggregate({ args, query }) {
          return query(withTenantFilterWhere(args) as unknown as typeof args);
        },
        async groupBy({ args, query }) {
          return query(withTenantFilterWhere(args) as unknown as typeof args);
        },
        async create({ args, query }) {
          return query(withTenantData(args) as unknown as typeof args);
        },
        async createMany({ args, query }) {
          return query(withTenantData(args) as unknown as typeof args);
        },
        async update({ args, query }) {
          return query(withTenantUpdate(args) as unknown as typeof args);
        },
        async updateMany({ args, query }) {
          return query(withTenantUpdateMany(args) as unknown as typeof args);
        },
        async upsert({ args, query }) {
          return query(withTenantUpsert(args) as unknown as typeof args);
        },
        async delete({ args, query }) {
          return query(withTenantUniqueWhere(args) as unknown as typeof args);
        },
        async deleteMany({ args, query }) {
          return query(withTenantFilterWhere(args) as unknown as typeof args);
        },
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

/**
 * In production, cache the Prisma client globally to prevent connection churn
 * during module reloads. In development, always create a fresh client so that
 * HMR picks up extension changes (e.g. tenant isolation logic). Without this,
 * the cached extension's closure never reflects updated function references.
 */
export const prisma =
  process.env.NODE_ENV === 'production'
    ? (globalForPrisma.prisma ?? prismaClientSingleton())
    : prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
