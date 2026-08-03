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

export default async function AdminUsersPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  const page = parseInt(searchParams.page || "1", 10);
  const take = 20;
  const skip = (page - 1) * take;

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.user.count(),
  ]);

  const totalPages = Math.ceil(totalCount / take);

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
        <div className="space-y-4">
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
                    <UserActions userId={user.id} isStudent={user.role === "STUDENT"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="text-sm text-slate-500">
                Showing {skip + 1} to {Math.min(skip + take, totalCount)} of {totalCount} results
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/users?page=${page - 1}`} passHref>
                  <Button variant="secondary" disabled={page <= 1}>Previous</Button>
                </Link>
                <Link href={`/admin/users?page=${page + 1}`} passHref>
                  <Button variant="secondary" disabled={page >= totalPages}>Next</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

