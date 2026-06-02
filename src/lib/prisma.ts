import { PrismaClient, Prisma } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async findMany({ model: _model, args, query }) {
          return query({ ...args, where: { isDeleted: false, ...(args.where ?? {}) } } as typeof args);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async findFirst({ model: _model, args, query }) {
          return query({ ...args, where: { isDeleted: false, ...(args.where ?? {}) } } as typeof args);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async count({ model: _model, args, query }) {
          return query({ ...args, where: { isDeleted: false, ...(args.where ?? {}) } } as typeof args);
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
