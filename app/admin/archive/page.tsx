"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ArchivePage() {
  const [archiveYear, setArchiveYear] = useState("");
  const [purgeYear, setPurgeYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  async function handleAction(action: "archive" | "purge", year: string) {
    if (!year) {
      setMessage({ type: "error", text: "Please provide an academic year (e.g. 2023-2024)" });
      return;
    }

    const confirmMsg = action === "archive"
      ? `Are you sure you want to soft-archive ALL current active/ended sessions to ${year}? They will no longer appear in daily views but will be preserved.`
      : `CRITICAL WARNING: Are you sure you want to HARD PURGE all data for ${year}? This will PERMANENTLY DELETE all sessions and attendance records. This action cannot be undone!`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, academicYear: year })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (action === "archive") {
          setMessage({ type: "success", text: `Successfully archived ${data.archivedCount} sessions.` });
          setArchiveYear("");
        } else {
          setMessage({ type: "success", text: `Successfully purged ${data.deletedCount} sessions and their attendance records.` });
          setPurgeYear("");
        }
      } else {
        setMessage({ type: "error", text: data.error || "Action failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "A network error occurred." });
    }
    
    setLoading(false);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Academic Year Archival</h1>
      
      {message && (
        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">Soft Archive Current Year</h2>
          <p className="mb-4 text-sm text-slate-600">
            Moves all unarchived sessions and attendance records into a historical state. They will no longer appear in active dashboards but will remain in the database for manual CSV export.
          </p>
          
          <div className="space-y-4">
            <Input 
              label="Academic Year Label" 
              placeholder="e.g. 2023-2024" 
              value={archiveYear}
              onChange={(e) => setArchiveYear(e.target.value)}
            />
            <Button 
              onClick={() => handleAction("archive", archiveYear)}
              loading={loading}
            >
              Archive Current Data
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-red-800">Hard Purge Old Year</h2>
          <p className="mb-4 text-sm text-red-700">
            Permanently deletes all archived sessions and attendance records for a given academic year. Only do this after backing up your database!
          </p>
          
          <div className="space-y-4">
            <Input 
              label="Academic Year to Purge" 
              placeholder="e.g. 2021-2022" 
              value={purgeYear}
              onChange={(e) => setPurgeYear(e.target.value)}
            />
            <Button 
              variant="danger"
              onClick={() => handleAction("purge", purgeYear)}
              loading={loading}
            >
              Permanently Purge Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
