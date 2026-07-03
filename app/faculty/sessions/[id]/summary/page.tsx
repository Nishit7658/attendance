import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttendanceStats } from "@/components/faculty/AttendanceStats";
import { StudentTable } from "@/components/faculty/StudentTable";
import type { StudentRow } from "@/components/faculty/StudentTable";

interface SummaryPageProps {
  params: { id: string };
}

export default async function SessionSummaryPage({ params }: SummaryPageProps) {
  const session = await auth();
  if (!session?.user) {
    return (
      <EmptyState
        title="Unauthorized"
        description="Please sign in to view this page."
        action={
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        }
      />
    );
  }

  const dbSession = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      course: true,
      faculty: true,
      attendanceRecords: {
        include: {
          editLogs: {
            include: { editedBy: true },
            orderBy: { editedAt: "desc" },
          },
        },
      },
    },
  });

  if (!dbSession) {
    return (
      <EmptyState
        title="Session not found"
        description="This session doesn't exist or has been removed."
        action={
          <Link href="/faculty/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        }
      />
    );
  }

  const allStudents = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true },
  });
  const studentMap = new Map(allStudents.map((s) => [s.id, s]));

  const records = dbSession.attendanceRecords as Array<{
    studentId: string;
    id: string;
    status: string;
    editLogs: Array<{
      id: string;
      oldStatus: string;
      newStatus: string;
      editedBy: { name: string };
      editedAt: Date;
      reason: string | null;
    }>;
  }>;

  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;

  const studentRows: StudentRow[] = records.map((record) => {
    const stu = studentMap.get(record.studentId);
    return {
      id: record.studentId,
      rollNo: stu?.email ?? record.studentId,
      name: stu?.name ?? "Unknown Student",
      status: record.status as StudentRow["status"],
      attendanceRecordId: record.id,
      editLogs: record.editLogs.map((log) => ({
        id: log.id,
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        editedBy: { name: log.editedBy.name },
        editedAt: log.editedAt.toISOString(),
        reason: log.reason,
      })),
    };
  });

  const formatTime = (d: Date | null) =>
    d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  const csvUrl = `/api/faculty/sessions/${params.id}/export`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">{dbSession.course.name}</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
          <span>{new Date(dbSession.date).toLocaleDateString()}</span>
          <span>
            {formatTime(dbSession.startTime)} – {formatTime(dbSession.endTime)}
          </span>
          <span>Faculty: {dbSession.faculty.name}</span>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-4">
        <AttendanceStats total={total} present={present} absent={absent} late={late} />
        <a href={csvUrl} download={`attendance-${params.id}.csv`}>
          <Button variant="secondary" size="sm">
            Export CSV
          </Button>
        </a>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <StudentTable students={studentRows} sessionId={params.id} />
      </div>
    </div>
  );
}
