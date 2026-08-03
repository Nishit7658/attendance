import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test setup.
 *
 * Requires a running, seeded PostgreSQL database reachable via `DATABASE_URL`
 * (see `prisma/seed.ts`). The web server is booted automatically.
 *
 * The full "login -> forced password change -> re-login -> dashboard" journey
 * mutates the admin password, so it only runs when `E2E_RUN_FULL_FLOW=1`
 * (set in CI where the DB is fresh per run).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
