import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTodaySessions, getActiveSession } from "@/lib/faculty-service";
import SessionCard from "@/components/faculty/SessionCard";
import AdHocForm from "@/components/faculty/AdHocForm";

export default async function FacultyDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
    redirect("/login");
  }

  const [todaySessions, activeSession] = await Promise.all([
    getTodaySessions(user.id),
    getActiveSession(user.id),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          Faculty Dashboard
        </h1>
        <Link
          href="/faculty/timetable"
          className="text-xs text-primary hover:underline transition-colors"
        >
          View full timetable
        </Link>
      </div>

      {activeSession && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">
                You have an active session — {activeSession.course.name}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {activeSession._count.attendanceRecords} student(s) marked
              </p>
            </div>
            <a
              href={`/faculty/sessions/${activeSession.id}/live`}
              className="btn-primary px-4 py-2 text-xs"
            >
              Return to session
            </a>
          </div>
        </div>
      )}

      {todaySessions.length > 0 ? (
        <div className="rounded border border-border">
          <div className="px-4 py-2 border-b border-border bg-surface">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">
              Today&apos;s Sessions
            </span>
          </div>
          {todaySessions.map((entry) => (
            <SessionCard
              key={entry.id}
              id={entry.id}
              courseCode={entry.course.code}
              courseName={entry.course.name}
              startTime={entry.startTime.toISOString()}
              endTime={entry.endTime.toISOString()}
              room={entry.room}
              section={entry.section || ""}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border border-border px-5 py-8 text-center">
          <p className="text-sm text-muted mb-4">
            No sessions scheduled today
          </p>
          <AdHocForm />
        </div>
      )}
    </div>
  );
}
