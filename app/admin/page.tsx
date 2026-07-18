import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  const [totalUsers, totalCourses, todaySessions, activeSessions] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.session.count({ where: { date: new Date() } }),
    prisma.session.count({ where: { status: "ACTIVE" } }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers },
    { label: "Total Courses", value: totalCourses },
    { label: "Today's Sessions", value: todaySessions },
    { label: "Active Sessions", value: activeSessions },
  ];

  const quickLinks = [
    { label: "Manage Users", href: "/admin/users", description: "Add, edit, or remove faculty, students, and HODs" },
    { label: "Manage Courses", href: "/admin/courses", description: "Create and manage courses and subjects" },
    { label: "Timetables", href: "/admin/timetables", description: "Configure weekly timetables for divisions" },
    { label: "Reports", href: "/admin/reports", description: "System-wide attendance reports and analytics" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Admin Dashboard
      </h1>
      
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md hover:bg-surface-hover group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
            <p className="text-3xl font-bold text-primary">{stat.value}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

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
