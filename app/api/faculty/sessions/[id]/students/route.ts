import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["FACULTY", "HOD", "ADMIN"]);

    const session = await prisma.session.findUnique({
      where: { id: params.id },
      select: { facultyId: true, courseId: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // HOD and ADMIN can see any session; Faculty can only see their own
    if (user.role === "FACULTY" && session.facultyId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all students with their attendance records and flag status for this session
    const [students, records] = await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT" },
        select: { id: true, name: true, enrollmentNo: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.attendanceRecord.findMany({
        where: { sessionId: params.id },
        select: { studentId: true, status: true, isFlagged: true, flagReason: true },
      }),
    ]);

    const recordMap = new Map(records.map((r) => [r.studentId, r]));

    const studentsWithStatus = students.map((s) => {
      const rec = recordMap.get(s.id);
      return {
        id: s.id,
        name: s.name,
        rollNo: s.enrollmentNo ?? s.email,
        status: rec?.status ?? null,
        isFlagged: rec?.isFlagged ?? false,
        flagReason: rec?.flagReason ?? null,
      };
    });

    return NextResponse.json({ students: studentsWithStatus });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
