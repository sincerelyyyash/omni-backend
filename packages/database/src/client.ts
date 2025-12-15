import { PrismaClient } from "../generated/client";
import { adapter } from "../prisma/prisma.config";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "../generated/client";
export type { PrismaClient };
export { adapter } from "../prisma/prisma.config";
