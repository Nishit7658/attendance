"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        department: form.get("department"),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create user");
      setLoading(false);
      return;
    }

    router.push("/admin/users");
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Add User</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input label="Name" name="name" id="name" required />

        <Input label="Email" name="email" id="email" type="email" required />

        <Input label="Password" name="password" id="password" type="password" required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-slate-700">Role</label>
          <select
            id="role"
            name="role"
            required
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <option value="">Select role</option>
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="HOD">HOD</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <Input label="Department" name="department" id="department" />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading}>Create User</Button>
          <Link href="/admin/users">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
