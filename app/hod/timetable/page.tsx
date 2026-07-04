import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimetableGrid, type TimetableEntry } from "@/components/ui/TimetableGrid";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function HODTimetablePage() {
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
    return <p className="text-sm text-slate-500">No department assigned.</p>;
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { faculty: { department } },
    include: {
      course: { select: { code: true, name: true } },
      faculty: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const timetableEntries: TimetableEntry[] = entries.map((e) => ({
    id: e.id,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    courseCode: e.course.code,
    courseName: e.course.name,
    facultyName: e.faculty.name,
    room: e.room,
    section: e.section,
  }));

  return (
    <div className="max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">
        {department} — Timetable
      </h1>

      {timetableEntries.length === 0 ? (
        <EmptyState
          title="No timetable entries"
          description="No classes are scheduled for this department."
        />
      ) : (
        <TimetableGrid entries={timetableEntries} showFaculty />
      )}
    </div>
  );
}
