"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface CourseActionsProps {
  courseId: string;
}

export function CourseActions({ courseId }: CourseActionsProps) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this course?")) return;

    const res = await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete course");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/courses/${courseId}/edit`}>
        <Button variant="ghost" size="sm">Edit</Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={handleDelete}>Delete</Button>
    </div>
  );
}
