"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
        <div className="max-w-md text-center bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">System Error</h2>
          <p className="text-xs text-slate-500 mb-6">
            {error?.message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
