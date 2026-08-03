import { verifyCsrfOrigin } from "@/lib/csrf";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { AppError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { updateAttendance } from "@/lib/faculty-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; studentId: string } }
) {
  try {
    verifyCsrfOrigin(request);
  } catch (csrfErr) {
    const err = csrfErr as Error & { statusCode?: number };
    return NextResponse.json({ error: err.message }, { status: err.statusCode || 403 });
  }

  try {
    const user = await requireRole(["FACULTY", "HOD", "ADMIN"]);

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
      user.id,
      undefined,
      user.role !== "FACULTY" // HOD and ADMIN can mark any session
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
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "An error occurred" }, { status: 400 });
  }
}
