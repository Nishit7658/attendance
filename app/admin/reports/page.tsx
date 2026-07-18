import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [totalSessionsThisMonth, totalUsers, monthlySessions] = await Promise.all([
    prisma.session.count({
      where: { date: { gte: startOfMonth, lt: startOfNextMonth } },
    }),
    prisma.user.count(),
    prisma.session.findMany({
      where: { date: { gte: startOfMonth, lt: startOfNextMonth } },
      include: {
        course: { select: { department: true, name: true, code: true } },
        _count: { select: { attendanceRecords: true } },
        attendanceRecords: { select: { status: true } },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  let totalRecords = 0;
  let presentCount = 0;
  for (const s of monthlySessions) {
    totalRecords += s._count.attendanceRecords;
    presentCount += s.attendanceRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  }
  const overallRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : "0";

  const deptMap = new Map<string, { sessions: number; present: number; total: number }>();
  for (const s of monthlySessions) {
    const dept = s.course.department || "Unknown";
    if (!deptMap.has(dept)) deptMap.set(dept, { sessions: 0, present: 0, total: 0 });
    const entry = deptMap.get(dept)!;
    entry.sessions++;
    entry.total += s._count.attendanceRecords;
    entry.present += s.attendanceRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  }
  const deptBreakdown = Array.from(deptMap.entries())
    .map(([department, data]) => ({
      department,
      sessions: data.sessions,
      rate: data.total > 0 ? ((data.present / data.total) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));

  const courseAttendanceMap = new Map<string, { code: string; name: string; total: number; present: number }>();
  for (const s of monthlySessions) {
    const key = s.courseId;
    if (!courseAttendanceMap.has(key)) {
      courseAttendanceMap.set(key, { code: s.course.code, name: s.course.name, total: 0, present: 0 });
    }
    const entry = courseAttendanceMap.get(key)!;
    entry.total += s._count.attendanceRecords;
    entry.present += s.attendanceRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  }

  const topCourses = Array.from(courseAttendanceMap.entries())
    .map(([, data]) => ({
      ...data,
      rate: data.total > 0 ? ((data.present / data.total) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Reports</h1>

      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <p className="text-2xl font-semibold text-navy-700">{totalSessionsThisMonth}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Sessions This Month</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <p className="text-2xl font-semibold text-navy-700">{overallRate}%</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Avg Attendance Rate</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <p className="text-2xl font-semibold text-navy-700">{totalUsers}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Total Users</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <p className="text-2xl font-semibold text-navy-700">{totalRecords}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">Attendance Records</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Department-wise Breakdown</h2>
          {deptBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No data available this month.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Sessions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {deptBreakdown.map((d) => (
                    <tr key={d.department} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{d.department}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{d.sessions}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{d.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Top 5 Courses by Attendance</h2>
          {topCourses.length === 0 ? (
            <p className="text-sm text-slate-500">No data available this month.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Course</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Records</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {topCourses.map((c) => (
                    <tr key={c.code} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{c.code} — {c.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{c.total}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{c.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
