import { prisma } from "@/lib/prisma";
import { generateQrToken } from "@/lib/qr-token";

export async function getTodaySessions(facultyId: string) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  return prisma.timetableEntry.findMany({
    where: { facultyId, dayOfWeek },
    include: { course: true },
    orderBy: { startTime: "asc" },
  });
}

export async function getActiveSession(facultyId: string) {
  return prisma.session.findFirst({
    where: { facultyId, status: "ACTIVE" },
    include: { course: true, _count: { select: { attendanceRecords: true } } },
  });
}

export async function startSession(timetableEntryId: string, facultyId: string) {
  const entry = await prisma.timetableEntry.findUnique({
    where: { id: timetableEntryId },
    include: { course: true },
  });
  if (!entry) throw new Error("Timetable entry not found");
  if (entry.facultyId !== facultyId) throw new Error("Unauthorized");

  const existing = await prisma.session.findFirst({
    where: { facultyId, status: "ACTIVE" },
  });
  if (existing) throw new Error("An active session already exists");

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.session.create({
      data: {
        timetableEntryId: entry.id,
        courseId: entry.courseId,
        facultyId,
        date: new Date(),
        startTime: new Date(),
        status: "ACTIVE",
      },
    });

    const qrToken = await generateQrToken(s.id);
    return tx.session.update({
      where: { id: s.id },
      data: { qrToken },
    });
  });

  return prisma.session.findUnique({
    where: { id: session.id },
    include: { course: true },
  });
}

export async function endSession(sessionId: string, facultyId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  if (session.facultyId !== facultyId) throw new Error("Unauthorized");
  if (session.status !== "ACTIVE") throw new Error("Session is not active");

  return prisma.session.update({
    where: { id: sessionId },
    data: { status: "ENDED", endTime: new Date() },
    include: { course: true, _count: { select: { attendanceRecords: true } } },
  });
}

export async function getSessionSummary(sessionId: string) {
  const [session, attendanceRecords, users] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { course: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { sessionId },
      include: { editLogs: { orderBy: { editedAt: "desc" } } },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!session) throw new Error("Session not found");

  const studentMap = new Map(users.map((u) => [u.id, u]));
  const records = attendanceRecords.map((r) => ({
    ...r,
    student: studentMap.get(r.studentId) ?? null,
  }));

  return { session, records };
}

export async function updateAttendance(
  sessionId: string,
  studentId: string,
  status: string,
  facultyId: string,
  reason?: string
) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  if (session.facultyId !== facultyId) throw new Error("Unauthorized");
  if (session.status !== "ACTIVE") throw new Error("Session is not active");

  if (!["PRESENT", "ABSENT", "LATE"].includes(status)) {
    throw new Error("Invalid attendance status");
  }

  const stu = await prisma.user.findUnique({ where: { id: studentId } });
  if (!stu || stu.role !== "STUDENT") throw new Error("Student not found");

  const existing = await prisma.attendanceRecord.findFirst({
    where: { sessionId, studentId },
  });

  if (existing) {
    if (existing.status !== status) {
      await prisma.editLog.create({
        data: {
          attendanceRecordId: existing.id,
          oldStatus: existing.status,
          newStatus: status as "PRESENT" | "ABSENT" | "LATE",
          editedById: facultyId,
          reason: reason ?? "Manual update by faculty",
        },
      });
      return prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { status: status as "PRESENT" | "ABSENT" | "LATE" },
      });
    }
    return existing;
  }

  return prisma.attendanceRecord.create({
    data: {
      sessionId,
      studentId,
      status: status as "PRESENT" | "ABSENT" | "LATE",
      markedById: facultyId,
    },
  });
}

export async function createAdHocSession(courseCode: string, facultyId: string) {
  const code = courseCode.trim();
  const course = await prisma.course.findUnique({ where: { code } });
  if (!course) throw new Error("Course not found");

  const existing = await prisma.session.findFirst({
    where: { facultyId, status: "ACTIVE" },
  });
  if (existing) throw new Error("An active session already exists");

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.session.create({
      data: {
        courseId: course.id,
        facultyId,
        date: new Date(),
        startTime: new Date(),
        status: "ACTIVE",
        isAdHoc: true,
      },
    });

    const qrToken = await generateQrToken(s.id);
    return tx.session.update({
      where: { id: s.id },
      data: { qrToken },
    });
  });

  return prisma.session.findUnique({
    where: { id: session.id },
    include: { course: true },
  });
}
