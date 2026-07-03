"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface UserActionsProps {
  userId: string;
}

export function UserActions({ userId }: UserActionsProps) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this user?")) return;

    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete user");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/users/${userId}/edit`}>
        <Button variant="ghost" size="sm">Edit</Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={handleDelete}>Delete</Button>
    </div>
  );
}
