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
    include: { branch: true }
  });

  if (!currentUser || (currentUser.role !== "HOD" && currentUser.role !== "ADMIN")) {
    redirect("/faculty/dashboard");
  }

  const branch = currentUser.branch;
  if (!branch) {
    return <p className="text-sm text-muted">No department assigned.</p>;
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

  const [facultyList, totalSessions] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FACULTY", branchId: branch.id },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.session.count({
      where: {
        date: { gte: rangeStart, lte: rangeEnd },
        faculty: { branchId: branch.id },
      },
    }),
  ]);

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      session: {
        faculty: { branchId: branch.id },
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
      email: faculty.email,
      sessionsConducted: data?.sessions.size ?? 0,
      avgAttendance: data && data.total > 0
        ? Math.round((data.present / data.total) * 100)
        : 0,
    };
  }).sort((a, b) => b.sessionsConducted - a.sessionsConducted);

  const isCustom = !!customFrom && !!customTo;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">{branch.name} Reports</h1>

      {/* Date range picker */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Period:</span>
        <form method="GET" action="/hod/reports" className="flex items-center gap-2">
          <input
            type="date"
            name="from"
            defaultValue={customFrom ?? ""}
            className="h-8 rounded border border-border bg-bg px-2 text-sm text-ink focus:border-primary focus:outline-none"
            aria-label="From date"
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            name="to"
            defaultValue={customTo ?? ""}
            className="h-8 rounded border border-border bg-bg px-2 text-sm text-ink focus:border-primary focus:outline-none"
            aria-label="To date"
          />
          <button
            type="submit"
            className="btn-primary px-3 py-1.5 text-xs"
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

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-2xl font-semibold text-ink">{facultyList.length}</p>
          <p className="text-sm font-medium text-muted">Total Faculty</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-2xl font-semibold text-ink">{totalSessions}</p>
          <p className="text-sm font-medium text-muted">Total Sessions Conducted</p>
        </div>
      </div>

      <p className="mb-4 text-xs text-slate-500">{rangeLabel}</p>

      <h2 className="mb-4 text-lg font-semibold text-ink">
        Faculty Overview
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
              <TableHead>Email</TableHead>
              <TableHead>Sessions Conducted</TableHead>
              <TableHead>Avg Attendance</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {facultySummaries.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-ink">{f.name}</TableCell>
                <TableCell className="text-muted">{f.email}</TableCell>
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
