import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimetableGrid, type TimetableEntry } from "@/components/ui/TimetableGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default async function FacultyTimetablePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
    redirect("/login");
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { facultyId: user.id },
    include: { course: { select: { code: true, name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const timetableEntries: TimetableEntry[] = entries.map((e) => ({
    id: e.id,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    courseCode: e.course.code,
    courseName: e.course.name,
    room: e.room,
    section: e.section,
  }));

  return (
    <div className="max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">My Timetable</h1>

      {timetableEntries.length === 0 ? (
        <EmptyState
          title="No timetable entries"
          description="You don't have any classes scheduled in the timetable yet."
          action={
            <Link href="/faculty/dashboard">
              <Button variant="primary" size="sm">Go to Dashboard</Button>
            </Link>
          }
        />
      ) : (
        <TimetableGrid entries={timetableEntries} />
      )}
    </div>
  );
}
