import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimetableCalendar, type CalendarEntry } from "@/components/timetable/TimetableCalendar";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function FacultyTimetablePage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
    redirect("/login");
  }

  const selectedDay = searchParams.day !== undefined ? parseInt(searchParams.day) : 1;

  const entries = await prisma.timetableEntry.findMany({
    where: { 
      facultyId: user.id,
      dayOfWeek: selectedDay
    },
    include: { course: { select: { code: true, name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const calendarEntries: CalendarEntry[] = entries.map((e) => ({
    id: e.id,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime,
    endTime: e.endTime,
    title: e.course.code,
    subtitle: e.course.name,
    room: e.room,
  }));

  return (
    <div className="max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-ink">My Timetable</h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {DAY_LABELS.map((label, i) => {
          if (i === 0) return null; // Skip Sunday
          return (
            <Link
              key={i}
              href={`/faculty/timetable?day=${i}`}
              className={`rounded border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                selectedDay === i
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted hover:text-ink hover:bg-surface"
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      <div className="bg-bg">
        <TimetableCalendar 
          entries={calendarEntries} 
          startHour={9} 
          endHour={17} 
          visibleDays={[selectedDay]} 
        />
      </div>
    </div>
  );
}
