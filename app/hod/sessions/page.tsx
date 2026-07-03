import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { FacultyFilter } from "@/components/hod/FacultyFilter";

interface PageProps {
  searchParams: { facultyId?: string };
}

function formatTime(dt: Date | null) {
  if (!dt) return "-";
  return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const statusVariant: Record<string, "success" | "danger" | "warning"> = {
  ACTIVE: "success",
  ENDED: "danger",
  SCHEDULED: "warning",
};

export default async function HODSessionsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser || (currentUser.role !== "HOD" && currentUser.role !== "ADMIN")) {
    redirect("/faculty/dashboard");
  }

  const department = currentUser.department;
  if (!department) {
    return <p className="text-sm text-slate-500">No department assigned.</p>;
  }

  const facultyMembers = await prisma.user.findMany({
    where: { role: "FACULTY", department },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const facultyIds = new Set(facultyMembers.map((f) => f.id));
  const facultyFilter = searchParams?.facultyId && facultyIds.has(searchParams.facultyId)
    ? searchParams.facultyId
    : undefined;

  const todaySessions = await prisma.session.findMany({
    where: {
      date: new Date(),
      faculty: { department },
      ...(facultyFilter ? { facultyId: facultyFilter } : {}),
    },
    include: {
      course: true,
      faculty: true,
      _count: { select: { attendanceRecords: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Today&apos;s Sessions</h1>

      <FacultyFilter facultyMembers={facultyMembers} currentFacultyId={facultyFilter} />

      {todaySessions.length === 0 ? (
        <EmptyState
          title="No sessions today"
          description={
            facultyFilter
              ? "No sessions scheduled today for this faculty member."
              : "No sessions scheduled today."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Course</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Students Marked</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {todaySessions.map((s) => (
              <TableRow
                key={s.id}
                className={cn(
                  s.status === "ACTIVE" && "border-l-2 border-l-navy-500 bg-navy-50/30",
                )}
              >
                <TableCell className="font-medium text-slate-900">
                  {s.course.name}
                </TableCell>
                <TableCell>{s.faculty.name}</TableCell>
                <TableCell>
                  {formatTime(s.startTime)} &ndash; {formatTime(s.endTime)}
                </TableCell>
                <TableCell>{s._count.attendanceRecords}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[s.status] ?? "neutral"}>
                    {s.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
