import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
      <h1 className="text-xl font-semibold text-slate-900 mb-6">
        Faculty Dashboard
      </h1>

      {activeSession && (
        <div className="mb-6 rounded border border-navy-200 bg-navy-50 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy-900">
                You have an active session — {activeSession.course.name}
              </p>
              <p className="text-xs text-navy-700 mt-0.5">
                {activeSession._count.attendanceRecords} student(s) marked
              </p>
            </div>
            <a
              href={`/faculty/sessions/${activeSession.id}/live`}
              className="rounded bg-navy-700 px-4 py-2 text-xs font-medium text-white hover:bg-navy-800 transition-colors"
            >
              Return to session
            </a>
          </div>
        </div>
      )}

      {todaySessions.length > 0 ? (
        <div className="rounded border border-slate-200">
          <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
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
              section={entry.section}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border border-slate-200 px-5 py-8 text-center">
          <p className="text-sm text-slate-500 mb-4">
            No sessions scheduled today
          </p>
          <AdHocForm />
        </div>
      )}
    </div>
  );
}
