import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { TimetableActions } from "./actions";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default async function AdminTimetablesPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (currentUser?.role !== "ADMIN") redirect("/faculty/dashboard");

  const selectedDay = searchParams.day !== undefined ? parseInt(searchParams.day) : undefined;

  const where = selectedDay !== undefined && !isNaN(selectedDay)
    ? { dayOfWeek: selectedDay }
    : {};

  const entries = await prisma.timetableEntry.findMany({
    where,
    include: {
      course: { select: { name: true, code: true } },
      faculty: { select: { name: true } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Timetables</h1>
        <Link href="/admin/timetables/new">
          <Button>Add Entry</Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/timetables"
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            selectedDay === undefined
              ? "bg-navy-700 text-white"
              : "border border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All
        </Link>
        {DAY_LABELS.map((label, i) => (
          <Link
            key={i}
            href={`/admin/timetables?day=${i}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedDay === i
                ? "bg-navy-700 text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-slate-500">
            {selectedDay !== undefined
              ? `No entries for ${DAY_LABELS[selectedDay]}.`
              : "No timetable entries found."}
          </p>
          <Link href="/admin/timetables/new">
            <Button variant="secondary" className="mt-4">Add your first entry</Button>
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium text-slate-900">{DAY_LABELS[entry.dayOfWeek]}</TableCell>
                <TableCell>{formatTime(new Date(entry.startTime))}</TableCell>
                <TableCell>{formatTime(new Date(entry.endTime))}</TableCell>
                <TableCell>{entry.course.code} — {entry.course.name}</TableCell>
                <TableCell>{entry.faculty.name}</TableCell>
                <TableCell>{entry.room}</TableCell>
                <TableCell>{entry.section}</TableCell>
                <TableCell>
                  <TimetableActions entryId={entry.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
