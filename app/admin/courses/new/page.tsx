"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.get("code"),
        name: form.get("name"),
        department: form.get("department"),
        credits: Number(form.get("credits")) || 3,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create course");
      setLoading(false);
      return;
    }

    router.push("/admin/courses");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Add Course</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input label="Course Code" name="code" id="code" required />

        <Input label="Course Name" name="name" id="name" required />

        <Input label="Department" name="department" id="department" required />

        <Input label="Credits" name="credits" id="credits" type="number" defaultValue="3" />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading}>Create Course</Button>
          <Link href="/admin/courses">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
