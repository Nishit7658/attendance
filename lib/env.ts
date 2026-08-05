/**
 * Validates that all required environment variables are set.
 * Import this early (e.g., in instrumentation.ts) to fail fast
 * instead of crashing at runtime on the first DB query or auth call.
 */

const required = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
] as const;

const optional = [
  "NEXTAUTH_URL",
  "QR_JWT_SECRET",
] as const;

export function validateEnv() {
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\nCopy .env.example to .env and fill in the values.`
    );
  }

  const unset = optional.filter((key) => !process.env[key]);
  if (unset.length > 0) {
    console.warn(`[env] Optional env vars not set: ${unset.join(", ")}`);
  }
}
