"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many requests. Please wait a moment before trying again.");
        } else {
          setError(data.error || "An unexpected error occurred.");
        }
        return;
      }

      // Surface dev link if present (never shown in production)
      if (data._devLink) setDevLink(data._devLink);
      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full bg-surface p-8 sm:p-10 rounded-lg border border-border shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-ink">Check your email</h1>
          <p className="mt-2 text-[13px] text-muted leading-relaxed">
            If that account exists, a password reset link has been sent to the registered email address. The link expires in 30 minutes.
          </p>
        </div>

        {/* Dev-only: surface the link so testers can use it without email transport */}
        {devLink && (
          <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs">
            <p className="mb-1 font-semibold text-amber-800">⚙ Dev mode — reset link (not shown in production):</p>
            <a
              href={devLink}
              className="break-all text-amber-700 underline hover:text-amber-900"
            >
              {devLink}
            </a>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-[13px] text-primary hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface p-8 sm:p-10 rounded-lg border border-border shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink mb-2">
          Forgot password?
        </h1>
        <p className="text-[13px] text-muted">
          Enter your enrollment number or email address and we&apos;ll send a reset link.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded bg-error/10 border border-error/20 text-error text-[13px] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Enrollment No / Email"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="e.g. 240410107071 or you@college.edu"
          required
          autoComplete="username"
          id="forgot-identifier"
        />
        <Button
          type="submit"
          disabled={loading}
          loading={loading}
          className="w-full py-2.5 text-[13px]"
        >
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-[13px] text-muted hover:text-ink transition-colors">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
