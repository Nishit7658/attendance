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

export default async function AdminUsersPage({ searchParams }: { searchParams: { page?: string; search?: string; role?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  const page = parseInt(searchParams.page || "1", 10);
  const take = 20;
  const skip = (page - 1) * take;
  const search = searchParams.search?.trim() || "";
  const roleFilter = searchParams.role || "";

  const validRoles = ["STUDENT", "FACULTY", "HOD", "ADMIN"];
  const where: Record<string, unknown> = {};

  if (roleFilter && validRoles.includes(roleFilter)) {
    where.role = roleFilter;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
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

      <form method="GET" className="mb-4 flex flex-wrap items-center gap-3">
        <input
          name="search"
          type="text"
          placeholder="Search by name or email..."
          defaultValue={search}
          className="h-10 w-64 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          <option value="">All Roles</option>
          {validRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <Button type="submit" variant="secondary">Filter</Button>
        {(search || roleFilter) && (
          <Link href="/admin/users">
            <Button type="button" variant="secondary">Clear</Button>
          </Link>
        )}
      </form>

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
                <Link href={`/admin/users?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}`} passHref>
                  <Button variant="secondary" disabled={page <= 1}>Previous</Button>
                </Link>
                <Link href={`/admin/users?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}`} passHref>
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

