import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const userSession = await auth();
  if (!userSession?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: userSession.user.email },
  });

  if (!currentUser || !["FACULTY", "HOD", "ADMIN"].includes(currentUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dbSession = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      course: true,
      attendanceRecords: {
        include: {
          editLogs: { orderBy: { editedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!dbSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (currentUser.role === "FACULTY" && dbSession.facultyId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studentIds = dbSession.attendanceRecords.map((r) => r.studentId);
  const students = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true, email: true },
  });
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const rows = dbSession.attendanceRecords.map((record) => {
    const stu = studentMap.get(record.studentId);
    return [
      escapeCsv(stu?.name ?? "Unknown Student"),
      escapeCsv(stu?.email ?? record.studentId),
      record.status,
      record.markedAt.toLocaleString("en-US"),
    ];
  });

  const header = ["Student Name", "Roll No", "Status", "Marked At"];
  const bom = "\uFEFF";
  const csv = bom + [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${params.id}.csv"`,
    },
  });
}
