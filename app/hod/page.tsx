import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HODDashboardPage() {
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
    return <p className="text-sm text-slate-500">No department assigned to your account.</p>;
  }

  const [facultyCount, todaySessions, recentSessions] = await Promise.all([
    prisma.user.count({ where: { role: "FACULTY", department } }),
    prisma.session.count({ where: { date: new Date(), faculty: { department } } }),
    prisma.session.findMany({
      where: { date: new Date(), faculty: { department } },
      include: { course: true, faculty: true, _count: { select: { attendanceRecords: true } } },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
  ]);

  const stats = [
    { label: "Faculty Members", value: facultyCount },
    { label: "Today&apos;s Sessions", value: todaySessions },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">{department} Department</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-navy-700">{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Today&apos;s Sessions</h2>
      {recentSessions.length === 0 ? (
        <p className="text-sm text-slate-500">No sessions scheduled today.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Faculty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Students</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {recentSessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{s.course.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{s.faculty.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{s._count.attendanceRecords}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
