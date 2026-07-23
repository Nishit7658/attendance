import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimetableCalendar, type CalendarEntry } from "@/components/timetable/TimetableCalendar";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function StudentTimetablePage({
  searchParams,
}: {
  searchParams: { day?: string; div?: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!currentUser || currentUser.role !== "STUDENT") redirect("/faculty/dashboard");

  // Fetch all divisions
  const divisions = await prisma.division.findMany({
    orderBy: { name: 'asc' }
  });

  // If division is selected in URL use it, otherwise default to first division
  const selectedDivId = searchParams.div || divisions[0]?.id;
  
  const selectedDay = searchParams.day !== undefined ? parseInt(searchParams.day) : 1;

  let entries: any[] = [];

  if (selectedDivId) {
    entries = await prisma.timetableEntry.findMany({
      where: { 
        divisionId: selectedDivId,
        dayOfWeek: selectedDay 
      },
      include: {
        course: { select: { code: true, name: true } },
        faculty: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
  }

  const calendarEntries: CalendarEntry[] = entries.map((e) => ({
    id: e.id,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime,
    endTime: e.endTime,
    title: e.course.code,
    subtitle: `${e.course.name} • ${e.faculty.name}`,
    room: e.room,
  }));

  return (
    <div className="max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-ink">
        Timetable
      </h1>

      <div className="mb-6 flex flex-col gap-4">
        {/* Division Selector */}
        <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto">
          {divisions.map(div => (
            <Link
              key={div.id}
              href={`/student/timetable?div=${div.id}&day=${selectedDay}`}
              className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors shrink-0 ${
                selectedDivId === div.id
                  ? "bg-primary text-white"
                  : "bg-surface text-ink hover:bg-surface-hover border border-border"
              }`}
            >
              {div.name}
            </Link>
          ))}
        </div>

        {/* Day Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {DAY_LABELS.map((label, i) => {
            if (i === 0) return null; // Skip Sunday
            return (
              <Link
                key={i}
                href={`/student/timetable?div=${selectedDivId}&day=${i}`}
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
