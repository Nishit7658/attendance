import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getExpectedStudentsForSession } from "@/lib/faculty-service";

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

    // Fetch expected students and attendance records for this session
    const [expectedStudents, records] = await Promise.all([
      getExpectedStudentsForSession(params.id),
      prisma.attendanceRecord.findMany({
        where: { sessionId: params.id },
        select: {
          studentId: true,
          status: true,
          isFlagged: true,
          flagReason: true,
          student: { select: { id: true, name: true, enrollmentNo: true, email: true } },
        },
      }),
    ]);

    const recordMap = new Map(records.map((r) => [r.studentId, r]));
    const studentMap = new Map(expectedStudents.map((s) => [s.id, s]));

    // Include students who marked attendance even if they were outside expected division/batch
    records.forEach((r) => {
      if (r.student && !studentMap.has(r.studentId)) {
        studentMap.set(r.studentId, r.student);
      }
    });

    const allStudents = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const studentsWithStatus = allStudents.map((s) => {
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
