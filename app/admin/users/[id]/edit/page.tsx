"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/users/${params.id}`);
      if (!res.ok) {
        setError("User not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const body: Record<string, unknown> = {
      name: form.get("name"),
      email: form.get("email"),
      role: form.get("role"),
      department: form.get("department"),
    };

    const password = form.get("password");
    if (password) body.password = password;

    const res = await fetch(`/api/admin/users/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to update user");
      setSaving(false);
      return;
    }

    router.push("/admin/users");
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading user...</p>;
  }

  if (error && !user) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/users">
          <Button variant="secondary" className="mt-4">Back to Users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Edit User</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input label="Name" name="name" id="name" defaultValue={user?.name} required />

        <Input label="Email" name="email" id="email" type="email" defaultValue={user?.email} required />

        <Input label="New Password (leave blank to keep current)" name="password" id="password" type="password" />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-slate-700">Role</label>
          <select
            id="role"
            name="role"
            required
            defaultValue={user?.role}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          >
            <option value="STUDENT">Student</option>
            <option value="FACULTY">Faculty</option>
            <option value="HOD">HOD</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <Input label="Department" name="department" id="department" defaultValue={user?.department ?? ""} />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={saving}>Save Changes</Button>
          <Link href="/admin/users">
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
