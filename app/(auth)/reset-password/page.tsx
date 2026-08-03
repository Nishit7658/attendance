"use client";

import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Missing token — bad link
  if (!token) {
    return (
      <div className="w-full bg-surface p-8 sm:p-10 rounded-lg border border-border shadow-sm text-center">
        <p className="text-[13px] text-error mb-4">
          This reset link is invalid or missing. Please request a new one.
        </p>
        <Link href="/forgot-password" className="text-[13px] text-primary hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!/[0-9!@#$%^&*]/.test(newPassword)) {
      setError("Password must contain at least one number or special character (!@#$%^&*).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full bg-surface p-8 sm:p-10 rounded-lg border border-border shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-200">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-ink mb-2">Password updated</h2>
        <p className="text-[13px] text-muted mb-6">
          Your password has been reset. All previous reset links are now invalid.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-primary px-5 py-2 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface p-8 sm:p-10 rounded-lg border border-border shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink mb-2">
          Reset your password
        </h1>
        <p className="text-[13px] text-muted">
          Choose a new password. Min 8 characters with at least one number or symbol.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded bg-error/10 border border-error/20 text-error text-[13px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="min 8 chars, includes a number or symbol"
          required
          autoComplete="new-password"
          id="reset-new-password"
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="repeat your new password"
          required
          autoComplete="new-password"
          id="reset-confirm-password"
        />
        <Button
          type="submit"
          disabled={loading}
          loading={loading}
          className="w-full py-2.5 text-[13px]"
        >
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full bg-surface p-8 sm:p-10 rounded-lg border border-border shadow-sm flex items-center justify-center min-h-[200px]">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
