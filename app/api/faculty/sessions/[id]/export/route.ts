import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  let currentUser;
  try {
    currentUser = await requireRole(["FACULTY", "HOD", "ADMIN"]);
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status }
    );
  }

  const dbSession = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      course: true,
      attendanceRecords: true,
    },
  });

  if (!dbSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (currentUser.role === "FACULTY" && dbSession.facultyId !== currentUser.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build a map of studentId -> record status
  const recordMap = new Map(
    dbSession.attendanceRecords.map((r) => [r.studentId, { status: r.status, markedAt: r.markedAt }])
  );

  // Get ALL students so the export is complete (not just those marked)
  const allStudents = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true, enrollmentNo: true },
    orderBy: { name: "asc" },
  });

  const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const header = ["Enrollment No", "Student Name", "Email", "Status", "Marked At"];

  const rows = allStudents.map((stu) => {
    const record = recordMap.get(stu.id);
    return [
      escapeCsv(stu.enrollmentNo ?? "N/A"),
      escapeCsv(stu.name ?? "Unknown"),
      escapeCsv(stu.email ?? ""),
      record ? record.status : "ABSENT",
      record ? record.markedAt.toLocaleString("en-IN") : "—",
    ];
  });

  const sessionDate = new Date(dbSession.date).toLocaleDateString("en-IN");
  const fileName = `attendance-${dbSession.course.code}-${sessionDate.replace(/\//g, "-")}.csv`;

  const bom = "\uFEFF";
  const csv = bom + [header.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
