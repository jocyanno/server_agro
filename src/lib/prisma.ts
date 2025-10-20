import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaClient: PrismaClient;

try {
  prismaClient = globalForPrisma.prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaClient;
  }
} catch (error) {
  console.error("Erro ao criar PrismaClient:", error);
  throw error;
}

export const prisma = prismaClient;
