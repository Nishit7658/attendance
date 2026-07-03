"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface FacultyOption {
  id: string;
  name: string;
}

interface TimetableData {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseId: string;
  facultyId: string;
  room: string;
  section: string;
  course: { id: string; code: string; name: string };
  faculty: { id: string; name: string };
}

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditTimetableEntryPage() {
  const router = useRouter();
  const params = useParams();
  const [entry, setEntry] = useState<TimetableData | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [entryRes, coursesRes, facultyRes] = await Promise.all([
        fetch(`/api/admin/timetables/${params.id}`),
        fetch("/api/admin/courses?list=true"),
        fetch("/api/admin/users?role=FACULTY&list=true"),
      ]);

      if (!entryRes.ok) {
        setError("Timetable entry not found");
        setLoading(false);
        return;
      }

      const entryData = await entryRes.json();
      setEntry(entryData.entry);

      if (coursesRes.ok) {
        const d = await coursesRes.json();
        setCourses(d.courses || []);
      }
      if (facultyRes.ok) {
        const d = await facultyRes.json();
        setFaculties(d.users || []);
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const body = {
      dayOfWeek: parseInt(form.get("dayOfWeek") as string),
      startTime: form.get("startTime"),
      endTime: form.get("endTime"),
      courseId: form.get("courseId"),
      facultyId: form.get("facultyId"),
      room: form.get("room"),
      section: form.get("section"),
    };

    const res = await fetch(`/api/admin/timetables/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to update timetable entry");
      setSaving(false);
      return;
    }

    router.push("/admin/timetables");
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading timetable entry...</p>;
  }

  if (error && !entry) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/timetables">
          <Button variant="secondary" className="mt-4">Back to Timetables</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Edit Timetable Entry</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dayOfWeek" className="text-sm font-medium text-slate-700">Day of Week</label>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            required
            defaultValue={entry?.dayOfWeek}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <option value="">Select day</option>
            {DAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <Input
          label="Start Time"
          name="startTime"
          id="startTime"
          type="datetime-local"
          defaultValue={entry ? toDatetimeLocal(new Date(entry.startTime)) : ""}
          required
        />

        <Input
          label="End Time"
          name="endTime"
          id="endTime"
          type="datetime-local"
          defaultValue={entry ? toDatetimeLocal(new Date(entry.endTime)) : ""}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="courseId" className="text-sm font-medium text-slate-700">Course</label>
          <select
            id="courseId"
            name="courseId"
            required
            defaultValue={entry?.courseId}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="facultyId" className="text-sm font-medium text-slate-700">Faculty</label>
          <select
            id="facultyId"
            name="facultyId"
            required
            defaultValue={entry?.facultyId}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <option value="">Select faculty</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <Input label="Room" name="room" id="room" defaultValue={entry?.room} required />

        <Input label="Section" name="section" id="section" defaultValue={entry?.section} required />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={saving}>Save Changes</Button>
          <Link href="/admin/timetables">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
