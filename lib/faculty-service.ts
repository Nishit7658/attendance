import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateQrToken } from "@/lib/qr-token";

export async function getTodaySessions(facultyId: string) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const todayEntries = await prisma.timetableEntry.findMany({
    where: { facultyId, dayOfWeek },
    include: { course: true },
    orderBy: { startTime: "asc" },
  });

  if (todayEntries.length > 0) {
    return todayEntries;
  }

  // Fallback: return all timetable entries assigned to this faculty so their dashboard is never empty
  return prisma.timetableEntry.findMany({
    where: { facultyId },
    include: { course: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function getActiveSession(facultyId: string) {
  return prisma.session.findFirst({
    where: { facultyId, status: "ACTIVE" },
    include: { course: true, _count: { select: { attendanceRecords: true } } },
  });
}

export async function startSession(timetableEntryId: string, facultyId: string, bypassOwnerCheck?: boolean) {
  const entry = await prisma.timetableEntry.findUnique({
    where: { id: timetableEntryId },
    include: { course: true },
  });
  if (!entry) throw new Error("Timetable entry not found");
  if (!bypassOwnerCheck && entry.facultyId !== facultyId) throw new Error("Unauthorized");

  // Use the entry's assigned faculty for the session (not the HOD/Admin who clicked start)
  const sessionFacultyId = bypassOwnerCheck ? entry.facultyId : facultyId;

  const existing = await prisma.session.findFirst({
    where: { facultyId: sessionFacultyId, status: "ACTIVE" },
  });
  if (existing) {
    // If it's for the same timetable entry, simply return the existing active session
    if (existing.timetableEntryId === timetableEntryId) {
      return prisma.session.findUnique({
        where: { id: existing.id },
        include: { course: true },
      });
    }
    // Otherwise, auto-end the previous active session so the user is never blocked
    await endSession(existing.id, sessionFacultyId, true, true);
  }

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.session.create({
      data: {
        timetableEntryId: entry.id,
        courseId: entry.courseId,
        facultyId: sessionFacultyId,
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

export async function getExpectedStudentsForSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      timetableEntry: true,
      course: true,
    },
  });

  if (!session) return [];

  const studentQuery: Prisma.UserWhereInput = { role: "STUDENT" };

  if (session.timetableEntry) {
    if (session.timetableEntry.divisionId) {
      studentQuery.divisionId = session.timetableEntry.divisionId;
    }
    if (session.timetableEntry.batchId) {
      studentQuery.batchId = session.timetableEntry.batchId;
    }
  } else if (session.course && session.course.branchId) {
    studentQuery.branchId = session.course.branchId;
  }

  let students = await prisma.user.findMany({
    where: studentQuery,
    select: { id: true, name: true, enrollmentNo: true, email: true },
    orderBy: { name: "asc" },
  });

  // Fallback: If specific filter returned 0 students, fallback to all students
  if (students.length === 0) {
    students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, enrollmentNo: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  return students;
}

export async function endSession(sessionId: string, facultyId: string, bypassOwnerCheck?: boolean, autoMarkAbsent: boolean = true) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  if (!bypassOwnerCheck && session.facultyId !== facultyId) throw new Error("Unauthorized");
  if (session.status !== "ACTIVE") throw new Error("Session is not active");

  if (autoMarkAbsent) {
    // Find all students who already have a record for this session
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: { sessionId },
      select: { studentId: true },
    });
    const markedIds = new Set(existingRecords.map((r) => r.studentId));

    // Get the expected student audience for this session
    const allStudents = await getExpectedStudentsForSession(sessionId);
    const unmarked = allStudents.filter((s) => !markedIds.has(s.id));

    // Bulk-create ABSENT records for all unmarked students in the roster
    if (unmarked.length > 0) {
      await prisma.attendanceRecord.createMany({
        data: unmarked.map((s) => ({
          sessionId,
          studentId: s.id,
          status: "ABSENT",
          markedById: facultyId,
        })),
        skipDuplicates: true,
      });
    }
  }

  return prisma.session.update({
    where: { id: sessionId },
    data: { status: "ENDED", endTime: new Date() },
    include: { course: true, _count: { select: { attendanceRecords: true } } },
  });
}

export async function getUnmarkedCount(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return 0;

  const existingRecords = await prisma.attendanceRecord.findMany({
    where: { sessionId },
    select: { studentId: true },
  });
  const markedIds = new Set(existingRecords.map((r) => r.studentId));

  const allStudents = await getExpectedStudentsForSession(sessionId);
  const unmarked = allStudents.filter((s) => !markedIds.has(s.id));

  return unmarked.length;
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
  reason?: string,
  bypassOwnerCheck?: boolean
) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  if (!bypassOwnerCheck && session.facultyId !== facultyId) throw new Error("Unauthorized");

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
  const course = await prisma.course.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
  });
  if (!course) throw new Error(`Course '${code}' not found`);

  const existing = await prisma.session.findFirst({
    where: { facultyId, status: "ACTIVE" },
  });
  if (existing) {
    // Auto-end previous active session so user is never blocked
    await endSession(existing.id, facultyId, true, true);
  }

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
