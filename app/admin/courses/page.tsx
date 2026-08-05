import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { CourseActions } from "./actions";

export default async function AdminCoursesPage({ searchParams }: { searchParams: { page?: string; search?: string } }) {
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

  const where = search
    ? {
        OR: [
          { code: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
          { department: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [courses, totalCount] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.course.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Courses</h1>
        <Link href="/admin/courses/new">
          <Button>Add Course</Button>
        </Link>
      </div>

      <form method="GET" className="mb-4 flex items-center gap-3">
        <input
          name="search"
          type="text"
          placeholder="Search by code, name, or department..."
          defaultValue={search}
          className="h-10 w-72 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        />
        <Button type="submit" variant="secondary">Search</Button>
        {search && (
          <Link href="/admin/courses">
            <Button type="button" variant="secondary">Clear</Button>
          </Link>
        )}
      </form>

      {courses.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">No courses found.</p>
          <Link href="/admin/courses/new">
            <Button variant="secondary" className="mt-4">Add your first course</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium text-slate-900">{course.code}</TableCell>
                  <TableCell>{course.name}</TableCell>
                  <TableCell>{course.department}</TableCell>
                  <TableCell>{course.credits}</TableCell>
                  <TableCell>
                    <CourseActions courseId={course.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="text-sm text-slate-500">
                Showing {skip + 1} to {Math.min(skip + take, totalCount)} of {totalCount} courses
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/courses?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`} passHref>
                  <Button variant="secondary" disabled={page <= 1}>Previous</Button>
                </Link>
                <Link href={`/admin/courses?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`} passHref>
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

