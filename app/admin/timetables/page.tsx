import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { TimetableCalendar, type CalendarEntry } from "@/components/timetable/TimetableCalendar";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminTimetablesPage({
  searchParams,
}: {
  searchParams: { day?: string; div?: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  // Fetch all divisions
  const divisions = await prisma.division.findMany({
    orderBy: { name: 'asc' }
  });

  const selectedDivId = searchParams.div || divisions[0]?.id;
  
  const dayParam = searchParams.day;
  const selectedDay = dayParam && dayParam !== "all" ? parseInt(dayParam) : undefined;
  const visibleDays = selectedDay !== undefined ? [selectedDay] : [1, 2, 3, 4, 5, 6];

  const entries = await prisma.timetableEntry.findMany({
    where: { 
      divisionId: selectedDivId,
      ...(selectedDay !== undefined ? { dayOfWeek: selectedDay } : {})
    },
    include: {
      course: { select: { name: true, code: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const calendarEntries: CalendarEntry[] = entries.map(e => ({
    id: e.id,
    dayOfWeek: e.dayOfWeek,
    startTime: e.startTime,
    endTime: e.endTime,
    title: e.course.code,
    subtitle: e.section === "ALL" ? "Lecture (All Batches)" : `Batch ${e.section}`,
    room: e.room,
    href: `/admin/timetables/${e.id}/edit`
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Timetables</h1>
        <Link href="/admin/timetables/new">
          <Button>Add Entry</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        {/* Division Selector */}
        <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto">
          {divisions.map(div => (
            <Link
              key={div.id}
              href={`/admin/timetables?div=${div.id}${dayParam ? `&day=${dayParam}` : ""}`}
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
          <Link
            href={`/admin/timetables?div=${selectedDivId}&day=all`}
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
                href={`/admin/timetables?div=${selectedDivId}&day=${i}`}
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
