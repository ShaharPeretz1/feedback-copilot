import { PrismaClient } from "@prisma/client";

// Prisma singleton — avoids exhausting connections during Next.js hot reload
// and in serverless (Vercel) where modules are re-evaluated per invocation.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
