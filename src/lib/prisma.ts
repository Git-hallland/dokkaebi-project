import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isFrontendOnly } from "@/lib/runtime-mode";

function createPrismaClient() {
  const connectionString = process.env.APP_DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("APP_DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let prismaInstance = globalForPrisma.prisma;

export function getPrisma() {
  if (isFrontendOnly()) {
    throw new Error("Prisma is unavailable in frontend-only preview mode.");
  }

  prismaInstance ??= createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }

  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
