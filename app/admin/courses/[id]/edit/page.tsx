"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface CourseData {
  id: string;
  code: string;
  name: string;
  department: string;
  credits: number;
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/courses/${params.id}`);
      if (!res.ok) {
        setError("Course not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCourse(data.course);
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
      code: form.get("code"),
      name: form.get("name"),
      department: form.get("department"),
      credits: Number(form.get("credits")) || 3,
    };

    const res = await fetch(`/api/admin/courses/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to update course");
      setSaving(false);
      return;
    }

    router.push("/admin/courses");
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading course...</p>;
  }

  if (error && !course) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/courses">
          <Button variant="secondary" className="mt-4">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Edit Course</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input label="Course Code" name="code" id="code" defaultValue={course?.code} required />

        <Input label="Course Name" name="name" id="name" defaultValue={course?.name} required />

        <Input label="Department" name="department" id="department" defaultValue={course?.department} required />

        <Input label="Credits" name="credits" id="credits" type="number" defaultValue={String(course?.credits ?? 3)} />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={saving}>Save Changes</Button>
          <Link href="/admin/courses">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
