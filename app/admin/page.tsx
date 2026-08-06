import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const [totalUsers, totalCourses, todaySessions, activeSessions, flaggedRecords, staleSessions] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.session.count({ where: { date: { gte: today, lt: tomorrow } } }),
    prisma.session.count({ where: { status: "ACTIVE" } }),
    prisma.attendanceRecord.count({ where: { isFlagged: true } }),
    prisma.session.findMany({
      where: { status: "ACTIVE", startTime: { lt: twoHoursAgo } },
      include: { course: true, faculty: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers },
    { label: "Total Courses", value: totalCourses },
    { label: "Today's Sessions", value: todaySessions },
    { label: "Active Now", value: activeSessions },
    { label: "Flagged Records", value: flaggedRecords },
  ];

  const quickLinks = [
    { label: "Manage Users", href: "/admin/users", description: "Add, edit, or remove faculty, students, and HODs" },
    { label: "Manage Courses", href: "/admin/courses", description: "Create and manage courses and subjects" },
    { label: "Timetables", href: "/admin/timetables", description: "Configure weekly timetables for divisions" },
    { label: "Reports", href: "/admin/reports", description: "System-wide attendance reports and analytics" },
    { label: "Import Data", href: "/admin/import", description: "Bulk import users and courses via CSV" },
    { label: "Settings", href: "/admin/settings", description: "LAN restrictions, QR intervals, and system config" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Admin Dashboard
      </h1>
      
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md hover:bg-surface-hover group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
            <p className="text-3xl font-bold text-primary">{stat.value}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {staleSessions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">
            Stale Active Sessions ({staleSessions.length})
          </h2>
          <p className="mb-3 text-xs text-amber-700">These sessions have been active for over 2 hours and may have been forgotten.</p>
          <div className="space-y-1">
            {staleSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs text-amber-800">
                <span className="font-medium">{s.course.name}</span>
                <span className="text-amber-600">
                  {s.faculty.name} · started {s.startTime ? new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "unknown"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold text-ink">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 hover:bg-surface-hover hover:border-primary/20"
            >
              <h3 className="font-semibold text-lg text-ink group-hover:text-primary transition-colors">{link.label}</h3>
              <p className="mt-2 text-sm text-muted">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

