"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface UserActionsProps {
  userId: string;
  isStudent?: boolean;
}

export function UserActions({ userId, isStudent }: UserActionsProps) {
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

  async function handleResetDevice() {
    if (!confirm("Reset the registered phone lock for this student?")) return;

    const res = await fetch("/api/admin/reset-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: userId }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Device lock reset successfully.");
      router.refresh();
    } else {
      alert(data.error || "Failed to reset device lock");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/users/${userId}/edit`}>
        <Button variant="ghost" size="sm">Edit</Button>
      </Link>
      {isStudent && (
        <Button variant="ghost" size="sm" onClick={handleResetDevice} className="text-amber-600 hover:text-amber-800">
          Reset Device
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-800">Delete</Button>
    </div>
  );
}
