import { Skeleton } from "@/components/ui/Skeleton";

export default function SummaryLoading() {
  return (
    <div>
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-96" />

      <div className="mb-6 flex items-center gap-8 rounded-lg border border-slate-200 bg-white px-6 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
