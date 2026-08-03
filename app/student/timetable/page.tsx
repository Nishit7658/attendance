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
  if (!session?.user?.id) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser || currentUser.role !== "STUDENT") redirect("/faculty/dashboard");

  const dayParam = searchParams.day;
  const selectedDay = dayParam && dayParam !== "all" ? parseInt(dayParam) : undefined;
  const visibleDays = selectedDay !== undefined ? [selectedDay] : [1, 2, 3, 4, 5, 6];

  let entries: {
    id: string;
    dayOfWeek: number;
    startTime: Date;
    endTime: Date;
    room: string;
    course: { code: string; name: string };
    faculty: { name: string };
  }[] = [];

  if (currentUser.divisionId) {
    entries = await prisma.timetableEntry.findMany({
      where: { 
        divisionId: currentUser.divisionId,
        // Only show classes for ALL batches OR the student's specific batch
        OR: [
          { batchId: null },
          { batchId: currentUser.batchId }
        ],
        ...(selectedDay !== undefined ? { dayOfWeek: selectedDay } : {})
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
        {/* Day Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/student/timetable?day=all`}
            className={`rounded border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              selectedDay === undefined
                ? "bg-primary text-white border-primary"
                : "border-border text-muted hover:text-ink hover:bg-surface"
            }`}
          >
            All Week
          </Link>
          {DAY_LABELS.map((label, i) => {
            if (i === 0) return null; // Skip Sunday
            return (
              <Link
                key={i}
                href={`/student/timetable?day=${i}`}
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
          visibleDays={visibleDays} 
        />
      </div>
    </div>
  );
}

