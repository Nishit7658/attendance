import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface PageProps {
  searchParams: { range?: string };
}

function formatDate(dt: Date) {
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dt: Date | null) {
  if (!dt) return "-";
  return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default async function FacultyHistoryPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
    redirect("/login");
  }

  const range = searchParams?.range ?? "all";
  const now = new Date();
  let dateFilter: Date | undefined;
  if (range === "7d") {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30d") {
    dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const sessions = await prisma.session.findMany({
    where: {
      facultyId: user.id,
      status: "ENDED",
      ...(dateFilter ? { date: { gte: dateFilter } } : {}),
    },
    include: {
      course: true,
      _count: { select: { attendanceRecords: true } },
    },
    orderBy: { date: "desc" },
  });

  const rangeLinks = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "All time", value: "all" },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-navy-900">Session History</h1>

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Range:</span>
        {rangeLinks.map((r) => (
          <Link
            key={r.value}
            href={`/faculty/history?range=${r.value}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              range === r.value
                ? "bg-navy-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No past sessions found"
          description={
            range !== "all"
              ? `No sessions ended in the selected period.`
              : "You haven't conducted any sessions yet."
          }
          action={
            <Link href="/faculty/dashboard">
              <Button variant="primary" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Date</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Students Marked</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-slate-900">
                  <Link
                    href={`/faculty/sessions/${s.id}/summary`}
                    className="hover:text-navy-700 hover:underline"
                  >
                    {formatDate(s.date)}
                  </Link>
                </TableCell>
                <TableCell>{s.course.name}</TableCell>
                <TableCell>{formatTime(s.startTime)}</TableCell>
                <TableCell>{formatTime(s.endTime)}</TableCell>
                <TableCell>{s._count.attendanceRecords}</TableCell>
                <TableCell>
                  <Badge variant="danger">ENDED</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
