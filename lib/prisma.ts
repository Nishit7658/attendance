import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Supabase pooler limits max clients to pool_size (15).
  // Enforce a strict connection_limit=3 per client instance to prevent EMAXCONNSESSION errors.
  if (!url.includes("connection_limit=")) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}connection_limit=3&pgbouncer=true`;
  }
  return url;
}

const prismaUrl = getPrismaUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: prismaUrl ? { db: { url: prismaUrl } } : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
