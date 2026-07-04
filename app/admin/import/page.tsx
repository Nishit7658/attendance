"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ImportEntity = "users" | "courses";
type RowStatus = "ok" | "skipped" | "error";

interface ImportResult {
  summary: { total: number; ok: number; skipped: number; errors: number };
  results: { row: number; status: RowStatus; message: string }[];
}

const entityConfig = {
  users: {
    label: "Users",
    description: "Import students, faculty, HODs, and admins",
    requiredColumns: ["name", "email", "role"],
    optionalColumns: ["department", "password"],
    sample: `name,email,role,department
John Doe,john@college.edu,STUDENT,Computer Science
Jane Smith,jane@college.edu,FACULTY,Computer Science`,
  },
  courses: {
    label: "Courses",
    description: "Import courses and subjects",
    requiredColumns: ["code", "name"],
    optionalColumns: ["department", "credits"],
    sample: `code,name,department,credits
CS101,Introduction to Programming,Computer Science,4
MA101,Calculus I,Mathematics,3`,
  },
};

function StatusBadge({ status }: { status: RowStatus }) {
  const styles = {
    ok: "bg-green-50 text-green-700 border-green-200",
    skipped: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status === "ok" ? "✓" : status === "skipped" ? "—" : "✗"} {status}
    </span>
  );
}

export default function AdminImportPage() {
  const router = useRouter();
  const [entity, setEntity] = useState<ImportEntity>("users");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const config = entityConfig[entity];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("entity", entity);
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Import Data</h1>

      {/* Entity selector */}
      <div className="mb-6 flex gap-3">
        {(Object.entries(entityConfig) as [ImportEntity, typeof config][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setEntity(key); handleReset(); }}
            className={cn(
              "rounded-lg border px-5 py-3 text-left transition-colors flex-1",
              entity === key
                ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700"
                : "border-slate-200 bg-white hover:bg-slate-50"
            )}
          >
            <p className="text-sm font-semibold text-slate-900">{cfg.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{cfg.description}</p>
          </button>
        ))}
      </div>

      {/* Upload form */}
      {!result && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Upload CSV</h2>

            <div className="mb-4">
              <label
                htmlFor="csv-file"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 hover:border-navy-500 hover:bg-navy-50/30 transition-colors"
              >
                <svg className="mb-3 h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-navy-700">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-600">
                      Drop a CSV file here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Required columns: {config.requiredColumns.join(", ")}
                      {config.optionalColumns.length > 0 && <> (optional: {config.optionalColumns.join(", ")})</>}
                    </p>
                  </>
                )}
                <input
                  ref={fileRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,.tsv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            {/* Sample */}
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                Show sample CSV format
              </summary>
              <pre className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 overflow-x-auto">
                {config.sample}
              </pre>
            </details>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!file || loading} loading={loading}>
              {loading ? "Importing..." : "Import Data"}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Import Results</h2>

            <div className="mb-6 grid grid-cols-4 gap-3">
              <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-slate-900">{result.summary.total}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total</p>
              </div>
              <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-green-700">{result.summary.ok}</p>
                <p className="text-xs text-green-600 mt-0.5">Created</p>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-amber-700">{result.summary.skipped}</p>
                <p className="text-xs text-amber-600 mt-0.5">Skipped</p>
              </div>
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-center">
                <p className="text-xl font-semibold text-red-700">{result.summary.errors}</p>
                <p className="text-xs text-red-600 mt-0.5">Errors</p>
              </div>
            </div>

            {result.results.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {result.results.map((r, idx) => (
                      <tr key={idx} className={cn(
                        "hover:bg-slate-50",
                        r.status === "error" && "bg-red-50/50",
                      )}>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{r.row}</td>
                        <td className="whitespace-nowrap px-3 py-2"><StatusBadge status={r.status} /></td>
                        <td className="px-3 py-2 text-xs text-slate-700">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleReset}>Import Another File</Button>
            <button
              onClick={() => router.push("/admin/users")}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              View Users
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
