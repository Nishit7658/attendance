import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimetableCalendar, type CalendarEntry } from "@/components/timetable/TimetableCalendar";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function HODTimetablePage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { branch: true },
  });

  if (!currentUser || (currentUser.role !== "HOD" && currentUser.role !== "ADMIN")) {
    redirect("/faculty/dashboard");
  }

  const branch = currentUser.branch;

  if (!branch) {
    return <p className="text-sm text-muted">No department assigned to your account.</p>;
  }

  const selectedDay = searchParams.day !== undefined ? parseInt(searchParams.day) : 1;

  const entries = await prisma.timetableEntry.findMany({
    where: { 
      faculty: { branchId: branch.id },
      dayOfWeek: selectedDay
    },
    include: {
      course: { select: { code: true, name: true } },
      faculty: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

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
        {branch.name} Timetable
      </h1>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {DAY_LABELS.map((label, i) => {
          if (i === 0) return null; // Skip Sunday
          return (
            <Link
              key={i}
              href={`/hod/timetable?day=${i}`}
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
