import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function HODReportsPage() {
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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [facultyList, monthSessionCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FACULTY", department },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.session.count({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        faculty: { department },
      },
    }),
  ]);

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      session: {
        faculty: { department },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    },
    include: {
      session: {
        include: {
          faculty: { select: { id: true, name: true } },
        },
      },
    },
  });

  const totalRecords = attendanceRecords.length;
  const presentRecords = attendanceRecords.filter((r) => r.status === "PRESENT").length;
  const avgAttendance = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

  const attendanceMap = new Map<
    string,
    { sessions: Set<string>; present: number; total: number }
  >();
  for (const record of attendanceRecords) {
    const facId = record.session.faculty.id;
    if (!attendanceMap.has(facId)) {
      attendanceMap.set(facId, { sessions: new Set(), present: 0, total: 0 });
    }
    const entry = attendanceMap.get(facId)!;
    entry.sessions.add(record.session.id);
    entry.total++;
    if (record.status === "PRESENT") entry.present++;
  }

  const facultySummaries = facultyList.map((faculty) => {
    const data = attendanceMap.get(faculty.id);
    return {
      id: faculty.id,
      name: faculty.name,
      sessionsConducted: data?.sessions.size ?? 0,
      avgAttendance: data && data.total > 0
        ? Math.round((data.present / data.total) * 100)
        : 0,
    };
  }).sort((a, b) => b.sessionsConducted - a.sessionsConducted);

  const stats = [
    { label: "Faculty Members", value: facultyList.length },
    { label: "Sessions This Month", value: monthSessionCount },
    { label: "Avg Attendance", value: `${avgAttendance}%` },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">{department} Reports</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-200 bg-white px-5 py-4"
          >
            <p className="text-2xl font-semibold text-navy-700">{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Per-Faculty Attendance
      </h2>

      {facultySummaries.length === 0 ? (
        <EmptyState
          title="No data yet"
          description="No sessions have been conducted this month."
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Faculty</TableHead>
              <TableHead>Sessions Conducted</TableHead>
              <TableHead>Avg Attendance</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {facultySummaries.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-slate-900">{f.name}</TableCell>
                <TableCell>{f.sessionsConducted}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      f.avgAttendance >= 75
                        ? "success"
                        : f.avgAttendance >= 50
                          ? "warning"
                          : "danger"
                    }
                  >
                    {f.avgAttendance}%
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
