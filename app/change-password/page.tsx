import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ForceChangePasswordPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // If they don't actually need a password change, send them to dashboard
  if (!session.user.needsPasswordChange) {
    switch (session.user.role) {
      case "FACULTY":
        redirect("/faculty/dashboard");
      case "STUDENT":
        redirect("/student");
      case "HOD":
        redirect("/hod");
      case "ADMIN":
        redirect("/admin");
      default:
        redirect("/login");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-ink">Change Your Password</h1>
        <p className="mb-6 text-sm text-muted">
          For security reasons, you must change your default password before continuing.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
