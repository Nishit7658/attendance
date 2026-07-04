import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authSession.user.id },
      select: { id: true, role: true },
    });
    if (!user || !["FACULTY", "HOD", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await prisma.session.findUnique({
      where: { id: params.id },
      select: { facultyId: true, courseId: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.facultyId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all students and their attendance records for this session
    const [students, records] = await Promise.all([
      prisma.user.findMany({
        where: { role: "STUDENT" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.attendanceRecord.findMany({
        where: { sessionId: params.id },
        select: { studentId: true, status: true },
      }),
    ]);

    const recordMap = new Map(records.map((r) => [r.studentId, r.status]));

    const studentsWithStatus = students.map((s) => ({
      id: s.id,
      name: s.name,
      rollNo: s.email,
      status: recordMap.get(s.id) ?? null,
    }));

    return NextResponse.json({ students: studentsWithStatus });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
