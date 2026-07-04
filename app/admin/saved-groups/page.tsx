"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface SavedGroup {
  id: string;
  name: string;
  description: string | null;
  createdBy: { name: string };
  _count: { members: number };
}

export default function AdminSavedGroupsPage() {
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStudents, setFormStudents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    Promise.all([
      fetch("/api/admin/saved-groups").then((r) => r.json()),
      fetch("/api/admin/users?list=true&role=STUDENT").then((r) => r.json()),
    ])
      .then(([groupsData, usersData]) => {
        setGroups(groupsData.groups ?? []);
        setStudents(usersData.users ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/saved-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDesc || undefined,
          studentIds: formStudents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");
      setGroups((prev) => [data.group, ...prev]);
      setShowCreate(false);
      setFormName(""); setFormDesc(""); setFormStudents([]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(groupId: string) {
    if (!confirm("Delete this group? This action cannot be undone.")) return;
    const res = await fetch(`/api/admin/saved-groups?id=${groupId}`, { method: "DELETE" });
    if (res.ok) {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    }
  }

  function toggleStudent(studentId: string) {
    setFormStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-navy-900">Saved Groups</h1>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Saved Groups</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Group"}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">New Saved Group</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Group Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                  placeholder="e.g., College Cricket Team"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description (optional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Add Members ({formStudents.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto rounded border border-slate-200">
                {students.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-slate-500">No students found. Import students first.</div>
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

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={creating || !formName.trim()} loading={creating}>
                {creating ? "Creating..." : "Create Group"}
              </Button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setError(null); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState
          title="No saved groups yet"
          description="Saved groups let you reuse the same set of students across multiple events — perfect for sports teams, clubs, or committees."
          action={<Button onClick={() => setShowCreate(true)}>Create Your First Group</Button>}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{group.name}</h3>
                  {group.description && (
                    <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                    <span>{group._count.members} members</span>
                    <span>Created by: {group.createdBy.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
