import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateAttendance } from "@/lib/faculty-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; studentId: string } }
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

    const { status } = await request.json();
    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    const record = await updateAttendance(
      params.id,
      params.studentId,
      status,
      user.id
    );

    const stu = await prisma.user.findUnique({
      where: { id: params.studentId },
      select: { name: true, email: true },
    });

    const editLogs = await prisma.editLog.findMany({
      where: { attendanceRecordId: record.id },
      include: { editedBy: { select: { name: true } } },
      orderBy: { editedAt: "desc" },
    });

    return NextResponse.json({
      id: params.studentId,
      rollNo: stu?.email ?? params.studentId,
      name: stu?.name ?? "Unknown Student",
      status: record.status,
      attendanceRecordId: record.id,
      editLogs: editLogs.map((log) => ({
        id: log.id,
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        editedBy: { name: log.editedBy.name },
        editedAt: log.editedAt.toISOString(),
        reason: log.reason,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "An error occurred" }, { status: 400 });
  }
}
