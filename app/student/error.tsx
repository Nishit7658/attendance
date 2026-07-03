"use client";

import { Button } from "@/components/ui/Button";

export default function StudentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-xl font-bold text-navy-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">An unexpected error occurred in the student portal.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
