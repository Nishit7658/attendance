"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function FacultyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Faculty Portal Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-7 w-7 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Faculty Portal Error</h2>
      <p className="max-w-md text-sm text-slate-600 mb-6">
        Unable to complete this session operation. Please try reloading or return to your dashboard.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-navy-600 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700 transition-colors"
        >
          Retry Action
        </button>
        <Link
          href="/faculty/dashboard"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Faculty Dashboard
        </Link>
      </div>
    </div>
  );
}
