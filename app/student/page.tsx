import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

import ChangePasswordModal from "@/components/student/ChangePasswordModal";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser) redirect("/login");
  if (currentUser.role !== "STUDENT") redirect("/faculty/dashboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let totalRecords = 0, totalPresent = 0, totalLate = 0, totalAbsent = 0;
  let courseRecords: Prisma.AttendanceRecordGetPayload<{ include: { session: { include: { course: true } } } }>[] = [];
  let todaySessions: Prisma.SessionGetPayload<{ include: { course: true, attendanceRecords: true } }>[] = [];
  
  try {
    // We need to fetch today's sessions for the student's division/batch separately from attendance records
    const sessionQuery: Prisma.SessionWhereInput = { date: { gte: today, lt: tomorrow } };
    
    // Filter sessions by student's division and batch (via timetableEntry)
    // For ad-hoc sessions, they might not have a timetableEntry, so we include them if course is in their branch
    // (A simpler approach for now is to just fetch sessions for their division's timetable entries)
    if (currentUser.divisionId) {
      sessionQuery.OR = [
        {
          timetableEntry: {
            divisionId: currentUser.divisionId,
            OR: [
              { batchId: null },
              { batchId: currentUser.batchId }
            ]
          }
        },
        // Also include ad-hoc sessions for courses in their branch (optional fallback)
        { timetableEntryId: null }
      ];
    }

    const results = await Promise.all([
      prisma.attendanceRecord.count({ where: { studentId: currentUser.id } }),
      prisma.attendanceRecord.count({ where: { studentId: currentUser.id, status: "PRESENT" } }),
      prisma.attendanceRecord.count({ where: { studentId: currentUser.id, status: "LATE" } }),
      prisma.attendanceRecord.count({ where: { studentId: currentUser.id, status: "ABSENT" } }),
      prisma.session.findMany({
        where: sessionQuery,
        include: { 
          course: true,
          attendanceRecords: {
            where: { studentId: currentUser.id }
          }
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId: currentUser.id },
        include: { session: { include: { course: true } } },
      }),
    ]);
    [totalRecords, totalPresent, totalLate, totalAbsent, todaySessions, courseRecords] = results;
  } catch (error) {
    console.error("Student dashboard data fetch error:", error);
    // Graceful degradation: empty lists/stats
  }

  const attendancePct = totalRecords > 0
    ? Math.round(((totalPresent + totalLate) / totalRecords) * 100)
    : 0;

  const stats = [
    { label: "Overall", value: `${attendancePct}%` },
    { label: "Present", value: totalPresent },
    { label: "Absent", value: totalAbsent },
    { label: "Total", value: totalRecords },
  ];

  // Per-subject breakdown
  const subjectMap = new Map<string, { code: string; name: string; total: number; attended: number }>();
  for (const r of courseRecords) {
    if (!r.session || !r.session.course) continue;
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
        <div>
          <h1 className="text-2xl font-bold text-navy-900">My Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Device Bound: {currentUser.deviceId ? "🔒 Protected" : "🔓 Will lock on 1st scan"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ChangePasswordModal />
          <Link
            href="/student/timetable"
            className="text-xs text-navy-600 hover:text-navy-800 underline transition-colors"
          >
            View timetable
          </Link>
        </div>
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
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isAtRisk ? "bg-red-500" : isBorderline ? "bg-amber-500" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <Badge variant={isAtRisk ? "danger" : isBorderline ? "warning" : "success"}>
                          {isAtRisk ? "At Risk" : isBorderline ? "Borderline" : "On Track"}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Today&apos;s Sessions</h2>
      {todaySessions.length === 0 ? (
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
              {todaySessions.map((sess) => {
                const hasRecord = sess.attendanceRecords && sess.attendanceRecords.length > 0;
                const status = hasRecord ? sess.attendanceRecords[0].status : null;
                
                return (
                  <tr key={sess.id} className="hover:bg-surface-hover">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                      {sess.course.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink">
                      {sess.startTime
                        ? new Date(sess.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {hasRecord ? (
                        <Badge variant={status === "PRESENT" ? "success" : status === "LATE" ? "warning" : "danger"}>
                          {status}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-slate-100 text-slate-600 border-slate-200">
                          PENDING
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

