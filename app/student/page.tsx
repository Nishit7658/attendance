import { redirect } from "next/navigation";
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

  const [totalRecords, totalPresent, totalLate, todayRecords] = await Promise.all([
    prisma.attendanceRecord.count({ where: { studentId: currentUser.id } }),
    prisma.attendanceRecord.count({ where: { studentId: currentUser.id, status: "PRESENT" } }),
    prisma.attendanceRecord.count({ where: { studentId: currentUser.id, status: "LATE" } }),
    prisma.attendanceRecord.findMany({
      where: { studentId: currentUser.id, session: { date: { gte: today, lt: tomorrow } } },
      include: { session: { include: { course: true } } },
      orderBy: { session: { startTime: "asc" } },
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">My Attendance</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-navy-700">{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Today&apos;s Sessions</h2>
      {todayRecords.length === 0 ? (
        <p className="text-sm text-slate-500">No sessions today.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {todayRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                    {record.session.course.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
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
