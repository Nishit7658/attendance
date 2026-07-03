"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface TimetableActionsProps {
  entryId: string;
}

export function TimetableActions({ entryId }: TimetableActionsProps) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this timetable entry?")) return;

    const res = await fetch(`/api/admin/timetables/${entryId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete timetable entry");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/timetables/${entryId}/edit`}>
        <Button variant="ghost" size="sm">Edit</Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={handleDelete}>Delete</Button>
    </div>
  );
}
