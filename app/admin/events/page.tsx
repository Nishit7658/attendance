"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banner } from "@/components/ui/Banner";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  scopeType: string;
  department: string | null;
  isApplied: boolean;
  createdAt: string;
  createdBy: { name: string };
  savedGroup: { name: string } | null;
  _count: { scopeItems: number };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [savedGroups, setSavedGroups] = useState<{ id: string; name: string; _count: { members: number } }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formScope, setFormScope] = useState<"DEPARTMENT" | "SAVED_GROUP" | "CUSTOM_LIST">("DEPARTMENT");
  const [formDept, setFormDept] = useState("");
  const [formGroup, setFormGroup] = useState("");
  const [formStudents, setFormStudents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/events").then((r) => r.json()),
      fetch("/api/admin/users?list=true").then((r) => r.json()),
      fetch("/api/admin/saved-groups").then((r) => r.json()),
    ])
      .then(([eventsData, usersData, groupsData]) => {
        setEvents(eventsData.events ?? []);
        setStudents(usersData.users ?? []);
        setSavedGroups(groupsData.groups ?? []);

        // Extract unique departments from students
        const depts = [...new Set(usersData.users?.map((u: { department?: string }) => u.department).filter(Boolean) as string[])];
        setDepartments(depts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDesc || undefined,
          startDate: formStart,
          endDate: formEnd,
          scopeType: formScope,
          department: formScope === "DEPARTMENT" ? formDept : undefined,
          savedGroupId: formScope === "SAVED_GROUP" ? formGroup : undefined,
          studentIds: formScope === "CUSTOM_LIST" ? formStudents : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create event");

      setEvents((prev) => [data.event, ...prev]);
      setShowCreate(false);
      resetForm();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setFormName(""); setFormDesc(""); setFormStart(""); setFormEnd("");
    setFormScope("DEPARTMENT"); setFormDept(""); setFormGroup(""); setFormStudents([]);
    setCreateError(null);
  }

  async function handleApply(eventId: string) {
    setApplying(eventId);
    setApplyResult(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/apply`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply");
      setApplyResult(`Applied: ${data.summary.attendanceMarked} records created across ${data.summary.sessionsFound} sessions`);
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, isApplied: true } : e));
    } catch (err: unknown) {
      setApplyResult(err instanceof Error ? `Error: ${err.message}` : "An error occurred");
    } finally {
      setApplying(null);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event? This won't remove already-marked attendance records.")) return;
    const res = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  }

  function toggleStudent(studentId: string) {
    setFormStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-navy-900">Events</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Events</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Event"}
        </Button>
      </div>

      {/* Apply result banner */}
      {applyResult && (
        <Banner variant={applyResult.startsWith("Error") ? "error" : "success"} className="mb-4">
          {applyResult}
          <button onClick={() => setApplyResult(null)} className="ml-2 text-xs underline">Dismiss</button>
        </Banner>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">New Event</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{createError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Event Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                  placeholder="e.g., Annual Sports Day"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description (optional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                  placeholder="Brief description"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Start Date</label>
                <input
                  type="date"
                  required
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">End Date</label>
                <input
                  type="date"
                  required
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Scope</label>
              <div className="flex gap-2">
                {(["DEPARTMENT", "SAVED_GROUP", "CUSTOM_LIST"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormScope(type)}
                    className={cn(
                      "rounded border px-3 py-1.5 text-xs font-medium transition-colors",
                      formScope === type
                        ? "border-navy-700 bg-navy-50 text-navy-900"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {type === "DEPARTMENT" ? "Department" : type === "SAVED_GROUP" ? "Saved Group" : "Custom List"}
                  </button>
                ))}
              </div>
            </div>

            {formScope === "DEPARTMENT" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
                <select
                  required
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {formScope === "SAVED_GROUP" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Saved Group</label>
                <select
                  required
                  value={formGroup}
                  onChange={(e) => setFormGroup(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                >
                  <option value="">Select group</option>
                  {savedGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g._count.members} members)</option>
                  ))}
                </select>
              </div>
            )}

            {formScope === "CUSTOM_LIST" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Select Students ({formStudents.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto rounded border border-slate-200">
                  {students.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500">Loading students...</div>
                  ) : (
                    students.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formStudents.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                        />
                        <span className="text-slate-900">{s.name}</span>
                        <span className="text-xs text-slate-400">{s.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={creating} loading={creating}>
                {creating ? "Creating..." : "Create Event"}
              </Button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Events let you auto-mark attendance for extracurricular activities, seminars, or college-wide events."
          action={<Button onClick={() => setShowCreate(true)}>Create Your First Event</Button>}
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const start = new Date(event.startDate).toLocaleDateString();
            const end = new Date(event.endDate).toLocaleDateString();
            return (
              <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{event.name}</h3>
                      <Badge variant={event.isApplied ? "success" : "neutral"}>
                        {event.isApplied ? "Applied" : "Pending"}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="mt-1 text-xs text-slate-500">{event.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{start} – {end}</span>
                      <span>Scope: {event.scopeType === "DEPARTMENT" ? event.department : event.scopeType === "SAVED_GROUP" ? event.savedGroup?.name : "Custom List"}</span>
                      <span>{event._count.scopeItems} students</span>
                      <span>By: {event.createdBy.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!event.isApplied && (
                      <button
                        onClick={() => handleApply(event.id)}
                        disabled={applying === event.id}
                        className="rounded bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
                      >
                        {applying === event.id ? "Applying..." : "Apply"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
