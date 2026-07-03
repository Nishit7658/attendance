"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AdHocForm() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/faculty/sessions/ad-hoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode: courseCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start session");
      router.push(data.redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => {
          setShowForm(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="rounded border border-navy-700 px-4 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50 transition-colors"
      >
        Start Ad-Hoc Session
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={courseCode}
        onChange={(e) => setCourseCode(e.target.value)}
        placeholder="Enter course code..."
        className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-navy-700 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !courseCode.trim()}
        className="rounded bg-navy-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
      >
        {loading ? "Starting..." : "Start"}
      </button>
      <button
        type="button"
        onClick={() => {
          setShowForm(false);
          setError(null);
          setCourseCode("");
        }}
        className="rounded px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
