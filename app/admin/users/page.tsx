import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { UserActions } from "./user-actions";

const roleBadgeVariant: Record<string, "default" | "success" | "danger" | "warning" | "neutral"> = {
  ADMIN: "danger",
  HOD: "warning",
  FACULTY: "default",
  STUDENT: "success",
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, department: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Users</h1>
        <Link href="/admin/users/new">
          <Button>Add User</Button>
        </Link>
      </div>

      {users.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No users found.</p>
          <Link href="/admin/users/new">
            <Button variant="secondary" className="mt-4">Add your first user</Button>
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-slate-900">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant[user.role]}>{user.role}</Badge>
                </TableCell>
                <TableCell>{user.department || "—"}</TableCell>
                <TableCell>
                  <UserActions userId={user.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
