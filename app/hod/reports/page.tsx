import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface PageProps {
  searchParams: { from?: string; to?: string };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function HODReportsPage({ searchParams }: PageProps) {
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

  // Determine date range
  const now = new Date();
  const customFrom = searchParams?.from;
  const customTo = searchParams?.to;

  let rangeStart: Date;
  let rangeEnd: Date;
  let rangeLabel: string;

  if (customFrom && customTo) {
    const fromDate = new Date(customFrom);
    const toDate = new Date(customTo);
    toDate.setHours(23, 59, 59, 999);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      rangeStart = fromDate;
      rangeEnd = toDate;
      rangeLabel = `${formatDate(rangeStart)} – ${formatDate(rangeEnd)}`;
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      rangeLabel = `This Month (${formatDate(rangeStart)} – ${formatDate(rangeEnd)})`;
    }
  } else {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    rangeLabel = `This Month (${formatDate(rangeStart)} – ${formatDate(rangeEnd)})`;
  }

  const [facultyList, monthSessionCount] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FACULTY", department },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.session.count({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
        faculty: { department },
      },
    }),
  ]);

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      session: {
        faculty: { department },
        date: { gte: rangeStart, lte: rangeEnd },
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
    { label: "Sessions in Period", value: monthSessionCount },
    { label: "Avg Attendance", value: `${avgAttendance}%` },
  ];

  const isCustom = !!customFrom && !!customTo;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">{department} Reports</h1>

      {/* Date range picker */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Period:</span>
        <form method="GET" action="/hod/reports" className="flex items-center gap-2">
          <input
            type="date"
            name="from"
            defaultValue={customFrom ?? ""}
            className="h-8 rounded border border-slate-300 px-2 text-sm text-slate-700 focus:border-navy-700 focus:outline-none"
            aria-label="From date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            name="to"
            defaultValue={customTo ?? ""}
            className="h-8 rounded border border-slate-300 px-2 text-sm text-slate-700 focus:border-navy-700 focus:outline-none"
            aria-label="To date"
          />
          <button
            type="submit"
            className="rounded bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800 transition-colors"
          >
            Go
          </button>
          {isCustom && (
            <Link
              href="/hod/reports"
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Reset to this month
            </Link>
          )}
        </form>
      </div>

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

      <p className="mb-4 text-xs text-slate-500">{rangeLabel}</p>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Per-Faculty Attendance
      </h2>

      {facultySummaries.length === 0 ? (
        <EmptyState
          title="No data yet"
          description="No sessions have been conducted in this period."
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
