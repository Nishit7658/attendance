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
    <div>
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Admin Dashboard</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-navy-700">{stat.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Links</h2>
      <div className="grid grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-slate-200 bg-white px-5 py-4 transition-colors hover:bg-slate-50"
          >
            <h3 className="font-medium text-navy-700">{link.label}</h3>
            <p className="mt-1 text-sm text-slate-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
