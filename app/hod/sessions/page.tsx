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
    include: { branch: true },
  });

  if (!currentUser || (currentUser.role !== "HOD" && currentUser.role !== "ADMIN")) {
    redirect("/faculty/dashboard");
  }

  const branch = currentUser.branch;
  if (!branch) {
    return <p className="text-sm text-muted">No department assigned.</p>;
  }

  const facultyMembers = await prisma.user.findMany({
    where: { role: "FACULTY", branchId: branch.id },
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
      faculty: { branchId: branch.id },
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
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-ink">Department Sessions</h1>
        <FacultyFilter facultyMembers={facultyMembers} currentFacultyId={facultyFilter} />
      </div>

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
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Students Marked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todaySessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-ink">
                  {s.course.name}
                </TableCell>
                <TableCell>{s.faculty.name}</TableCell>
                <TableCell>{new Date(s.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"} 
                  {" - "}
                  {s.endTime ? new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "ENDED" ? "neutral" : "primary"}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell>{s._count.attendanceRecords}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
