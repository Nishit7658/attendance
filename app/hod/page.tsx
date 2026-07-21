import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HODDashboardPage() {
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
    return <p className="text-sm text-muted">No department assigned to your account.</p>;
  }

  const [facultyCount, todaySessions, recentSessions] = await Promise.all([
    prisma.user.count({ where: { role: "FACULTY", branchId: branch.id } }),
    prisma.session.count({ where: { date: new Date(), faculty: { branchId: branch.id } } }),
    prisma.session.findMany({
      where: { date: new Date(), faculty: { branchId: branch.id } },
      include: { course: true, faculty: true, _count: { select: { attendanceRecords: true } } },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
  ]);

  const stats = [
    { label: "Faculty Members", value: facultyCount },
    { label: "Today's Sessions", value: todaySessions },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">{branch.name} Department</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface px-5 py-4 shadow-sm">
            <p className="text-2xl font-semibold text-ink">{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-4 text-lg font-semibold text-ink">Today's Sessions</h2>
      {recentSessions.length === 0 ? (
        <p className="text-sm text-muted">No sessions scheduled today.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-bg">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Faculty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Students</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {recentSessions.map((s) => (
                <tr key={s.id} className="hover:bg-bg transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">{s.course.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">{s.faculty.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">{s._count.attendanceRecords}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      s.status === 'ACTIVE' ? 'bg-success/20 text-success border border-success/30' : 'bg-bg text-muted border border-border'
                    }`}>
                      {s.status}
                    </span>
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
