import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Supabase recently introduced Supavisor pooler. Port 5432 is Session mode (limit 15).
  // Port 6543 is Transaction mode (allows hundreds of clients).
  // We should ONLY do this if they are actually using the pooler URL, not the direct db URL.
  if (url.includes("pooler.supabase.com") && url.includes(":5432")) {
    url = url.replace(":5432", ":6543");
  }

  // Enforce pgbouncer=true and a low connection limit per serverless instance
  if (!url.includes("connection_limit=")) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}connection_limit=1&pgbouncer=true&pool_timeout=15`;
  } else if (!url.includes("pgbouncer=true")) {
    url = `${url}&pgbouncer=true`;
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
