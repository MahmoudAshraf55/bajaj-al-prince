import { PrismaClient, Prisma } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends({
    model: {
      $allModels: {
        softDelete<T>(this: T, where: Record<string, unknown>) {
          const context = Prisma.getExtensionContext(this);
          return (context as any).update({
            where,
            data: { isDeleted: true, deletedAt: new Date() },
          });
        },
      },
    },
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          args.where = { isDeleted: false, ...(args.where ?? {}) } as unknown as typeof args.where;
          return query(args);
        },
        async findFirst({ model, args, query }) {
          args.where = { isDeleted: false, ...(args.where ?? {}) } as unknown as typeof args.where;
          return query(args);
        },
        async count({ model, args, query }) {
          args.where = { isDeleted: false, ...(args.where ?? {}) } as unknown as typeof args.where;
          return query(args);
        },
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
