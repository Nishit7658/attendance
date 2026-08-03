import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@college.edu";
const DEFAULT_ADMIN_PASSWORD = "Admin@College2024!";
const NEW_ADMIN_PASSWORD =
  process.env.E2E_ADMIN_NEW_PASSWORD ?? "NewAdmin@2026!";

test.describe("authentication", () => {
  test("unauthenticated users are redirected to /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("wrong credentials show an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Enrollment No \/ Username/i).fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
  });

  test("seeded admin is forced to change their default password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Enrollment No \/ Username/i).fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(DEFAULT_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Default seeded password must trigger the forced-change screen.
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(
      page.getByText(/you must change your default password/i)
    ).toBeVisible();
  });

  test("admin full journey: login, change password, re-login to /admin", async ({ page }) => {
    test.skip(
      !process.env.E2E_RUN_FULL_FLOW,
      "Mutates the admin password; opt in with E2E_RUN_FULL_FLOW=1 (CI only)."
    );

    await page.goto("/login");
    await page.getByLabel(/Enrollment No \/ Username/i).fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(DEFAULT_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/change-password$/);

    await page.getByLabel("Current Password").fill(DEFAULT_ADMIN_PASSWORD);
    await page.getByLabel("New Password", { exact: true }).fill(NEW_ADMIN_PASSWORD);
    await page.getByLabel("Confirm New Password").fill(NEW_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Update Password" }).click();

    // Password update signs the user out (see ChangePasswordForm).
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/Enrollment No \/ Username/i).fill(ADMIN_EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(NEW_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});
