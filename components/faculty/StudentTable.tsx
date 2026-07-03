"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { EditHistory, type EditLogEntry } from "@/components/faculty/EditHistory";

type Status = "PRESENT" | "ABSENT" | "LATE";

export type StudentRow = {
  id: string;
  rollNo: string;
  name: string;
  status: Status | null;
  attendanceRecordId: string | null;
  editLogs: EditLogEntry[];
};

interface StudentTableProps {
  students: StudentRow[];
  sessionId: string;
}

function statusBadgeVariant(status: Status | null) {
  switch (status) {
    case "PRESENT":
      return "success" as const;
    case "ABSENT":
      return "danger" as const;
    case "LATE":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function StudentTable({ students, sessionId }: StudentTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<Record<string, { status: Status; reason: string; saving: boolean; error: string | null }>>({});
  const [serverStudents, setServerStudents] = useState<StudentRow[]>(students);

  function toggleExpand(studentId: string) {
    if (expandedId === studentId) {
      setExpandedId(null);
      setEditStates((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    } else {
      setExpandedId(studentId);
      const student = serverStudents.find((s) => s.id === studentId);
      setEditStates((prev) => ({
        ...prev,
        [studentId]: { status: student?.status ?? "PRESENT", reason: "", saving: false, error: null },
      }));
    }
  }

  async function handleSave(studentId: string) {
    const state = editStates[studentId];
    if (!state) return;

    setEditStates((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], saving: true, error: null },
    }));

    try {
      const res = await fetch(`/api/faculty/sessions/${sessionId}/attendance/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: state.status, reason: state.reason || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save attendance");
      }

      const updated: StudentRow = await res.json();

      setServerStudents((prev) => prev.map((s) => (s.id === studentId ? updated : s)));
      setExpandedId(null);
      setEditStates((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    } catch (err) {
      setEditStates((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], saving: false, error: err instanceof Error ? err.message : "Something went wrong" },
      }));
    }
  }

  function handleCancel(studentId: string) {
    setExpandedId(null);
    setEditStates((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Roll No</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {serverStudents.map((student, idx) => {
          const isExpanded = expandedId === student.id;
          const editState = editStates[student.id];

          return (
            <>
              <TableRow
                key={student.id}
                className={isExpanded ? "bg-slate-50" : undefined}
              >
                <TableCell className="text-xs text-slate-400">{idx + 1}</TableCell>
                <TableCell className="font-medium text-slate-900">{student.name}</TableCell>
                <TableCell>{student.rollNo}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(student.status)}>
                    {student.status ?? "UNMARKED"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(student.id)}
                  >
                    {isExpanded ? "Close" : "Edit"}
                  </Button>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow key={`${student.id}-edit`}>
                  <TableCell colSpan={5} className="border-t-0 bg-slate-50 p-4">
                    {editState?.error && (
                      <Banner variant="error" className="mb-3">
                        {editState.error}
                      </Banner>
                    )}
                    <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Status
                        </label>
                        <select
                          className="input-field"
                          value={editState?.status ?? "PRESENT"}
                          onChange={(e) =>
                            setEditStates((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                status: e.target.value as Status,
                              },
                            }))
                          }
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                          <option value="LATE">Late</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Reason (optional)
                        </label>
                        <textarea
                          className="input-field"
                          rows={1}
                          value={editState?.reason ?? ""}
                          onChange={(e) =>
                            setEditStates((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                reason: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        loading={editState?.saving}
                        onClick={() => handleSave(student.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCancel(student.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                    {student.editLogs && student.editLogs.length > 0 && (
                      <EditHistory logs={student.editLogs} />
                    )}
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}
