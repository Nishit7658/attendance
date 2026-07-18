import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser || currentUser.role !== "STUDENT") redirect("/faculty/dashboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalRecords, totalPresent, totalLate, todayRecords, courseRecords] = await Promise.all([
    prisma.attendanceRecord.count({ where: { studentId: currentUser.id } }),
    prisma.attendanceRecord.count({ where: { studentId: currentUser.id, status: "PRESENT" } }),
    prisma.attendanceRecord.count({ where: { studentId: currentUser.id, status: "LATE" } }),
    prisma.attendanceRecord.findMany({
      where: { studentId: currentUser.id, session: { date: { gte: today, lt: tomorrow } } },
      include: { session: { include: { course: true } } },
      orderBy: { session: { startTime: "asc" } },
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId: currentUser.id },
      include: { session: { include: { course: true } } },
    }),
  ]);

  const attendancePct = totalRecords > 0
    ? Math.round(((totalPresent + totalLate) / totalRecords) * 100)
    : 0;

  const stats = [
    { label: "Overall Attendance", value: `${attendancePct}%` },
    { label: "Present", value: totalPresent },
    { label: "Late", value: totalLate },
    { label: "Total Sessions", value: totalRecords },
  ];

  // Per-subject breakdown
  const subjectMap = new Map<string, { code: string; name: string; total: number; attended: number }>();
  for (const r of courseRecords) {
    const course = r.session.course;
    const key = course.id;
    if (!subjectMap.has(key)) {
      subjectMap.set(key, { code: course.code, name: course.name, total: 0, attended: 0 });
    }
    const entry = subjectMap.get(key)!;
    entry.total++;
    if (r.status === "PRESENT" || r.status === "LATE") {
      entry.attended++;
    }
  }
  const subjectBreakdown = Array.from(subjectMap.values()).sort((a, b) => b.total - a.total);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-900">My Attendance</h1>
        <Link
          href="/student/timetable"
          className="text-xs text-navy-600 hover:text-navy-800 underline transition-colors"
        >
          View timetable
        </Link>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface px-5 py-4">
            <p className="text-2xl font-semibold text-primary">{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Per-Subject Breakdown */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Per-Subject Attendance</h2>
      {subjectBreakdown.length === 0 ? (
        <p className="mb-8 text-sm text-slate-500">No attendance records yet.</p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Course</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Attended</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted">%</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg">
              {subjectBreakdown.map((subj) => {
                const pct = subj.total > 0 ? Math.round((subj.attended / subj.total) * 100) : 0;
                const isAtRisk = pct < 75;
                const isBorderline = pct >= 75 && pct < 85;
                return (
                  <tr key={subj.code} className="hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                      <span className="text-xs text-muted">{subj.code}</span> {subj.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-ink">{subj.attended}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-ink">{subj.total}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-semibold">{pct}%</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                      <Badge variant={isAtRisk ? "danger" : isBorderline ? "warning" : "success"}>
                        {isAtRisk ? "At Risk" : isBorderline ? "Borderline" : "On Track"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Today&apos;s Sessions</h2>
      {todayRecords.length === 0 ? (
        <p className="text-sm text-slate-500">No sessions today.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg">
              {todayRecords.map((record) => (
                <tr key={record.id} className="hover:bg-surface-hover">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                    {record.session.course.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-ink">
                    {record.session.startTime
                      ? new Date(record.session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge variant={record.status === "PRESENT" ? "success" : record.status === "LATE" ? "warning" : "danger"}>
                      {record.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
