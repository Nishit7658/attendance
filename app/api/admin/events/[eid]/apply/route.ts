import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: { eid: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({
      where: { id: params.eid },
      include: {
        scopeItems: { select: { studentId: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.isApplied) {
      return NextResponse.json({ error: "Event has already been applied" }, { status: 400 });
    }

    const studentIds = event.scopeItems.map((s) => s.studentId);
    if (studentIds.length === 0) {
      return NextResponse.json({ error: "No students in event scope" }, { status: 400 });
    }

    // Find all sessions during the event's date range
    const eventStart = event.startDate;
    const eventEnd = event.endDate;

    const sessions = await prisma.session.findMany({
      where: {
        date: { gte: eventStart, lte: eventEnd },
        status: "ENDED",
      },
      include: {
        attendanceRecords: { select: { studentId: true } },
      },
    });

    // For each session, check which event students are NOT already marked
    let markedCount = 0;

    for (const session of sessions) {
      const markedStudentIds = new Set(session.attendanceRecords.map((r) => r.studentId));
      const unmarkedEventStudents = studentIds.filter(
        (sid) => !markedStudentIds.has(sid)
      );

      if (unmarkedEventStudents.length === 0) continue;

      // Create attendance records for unmarked students
      await prisma.attendanceRecord.createMany({
        data: unmarkedEventStudents.map((studentId) => ({
          sessionId: session.id,
          studentId,
          status: "PRESENT" as const,
          markedById: currentUser.id,
        })),
        skipDuplicates: true,
      });

      markedCount += unmarkedEventStudents.length;
    }

    // Mark event as applied
    await prisma.event.update({
      where: { id: params.eid },
      data: { isApplied: true },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalStudents: studentIds.length,
        sessionsFound: sessions.length,
        attendanceMarked: markedCount,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
