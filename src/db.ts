import { PrismaClient } from "@prisma/client";
import { AstroDataError } from "./errors";

const globalForAstro = globalThis as unknown as { astroPrisma?: PrismaClient };

function createClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new AstroDataError(
      "The ASTRO data layer is not configured: set DATABASE_URL to a PostgreSQL connection string.",
      503,
      "DATABASE_UNCONFIGURED",
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });
}

/**
 * One client per process. Next.js reloads route modules in development, so the
 * instance is cached on globalThis to stop every edit opening a new connection pool.
 */
export function astroDb(): PrismaClient {
  const cached = globalForAstro.astroPrisma;
  if (cached) return cached;

  const client = createClient();
  if (process.env.NODE_ENV !== "production") globalForAstro.astroPrisma = client;
  return client;
}

/** Prisma reads DATABASE_URL itself; this only reports whether the layer can run. */
export function astroConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
