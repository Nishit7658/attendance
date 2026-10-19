import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function pruneToCe4() {
  console.log(
    "Starting database cleanup: Pruning student accounts & attendance records to Division CE 4 only..."
  );

  const ce4Division = await prisma.division.findFirst({
    where: { name: "CE 4" },
    select: { id: true, name: true, semesterId: true },
  });

  if (!ce4Division) {
    throw new Error(
      'Division "CE 4" was not found in the database. Aborting cleanup to prevent accidental data loss.'
    );
  }

  // Locate all student users NOT assigned to Division CE 4 (i.e., CE 1, CE 2, CE 3, or unassigned)
  const nonCe4Students = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      OR: [
        { divisionId: { not: ce4Division.id } },
        { divisionId: null },
      ],
    },
    select: {
      id: true,
      name: true,
      enrollmentNo: true,
      email: true,
      division: { select: { name: true } },
    },
  });

  const nonCe4StudentIds = nonCe4Students.map((s) => s.id);

  if (nonCe4StudentIds.length === 0) {
    console.log("No non-CE 4 students found. Database is already clean.");
  } else {
    console.log(`Found ${nonCe4StudentIds.length} non-CE 4 student accounts to remove.`);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete EditLogs associated with attendance records of non-CE 4 students (or edited by them)
      const deletedEditLogs = await tx.editLog.deleteMany({
        where: {
          OR: [
            {
              attendanceRecord: {
                OR: [
                  { studentId: { in: nonCe4StudentIds } },
                  { markedById: { in: nonCe4StudentIds } },
                ],
              },
            },
            { editedById: { in: nonCe4StudentIds } },
          ],
        },
      });

      // 2. Delete AttendanceRecords where studentId or markedById belongs to non-CE 4 students
      //    (Note: student QR scans set markedById = student.id, which has no Cascade delete)
      const deletedAttendance = await tx.attendanceRecord.deleteMany({
        where: {
          OR: [
            { studentId: { in: nonCe4StudentIds } },
            { markedById: { in: nonCe4StudentIds } },
          ],
        },
      });

      // 3. Delete EventScopeItems referencing non-CE 4 students
      const deletedEventScopes = await tx.eventScopeItem.deleteMany({
        where: { studentId: { in: nonCe4StudentIds } },
      });

      // 4. Delete SavedGroupMembers referencing non-CE 4 students
      const deletedGroupMembers = await tx.savedGroupMember.deleteMany({
        where: { studentId: { in: nonCe4StudentIds } },
      });

      // 5. Safely delete non-CE 4 Student User records (strictly scoped to Role.STUDENT)
      const deletedUsers = await tx.user.deleteMany({
        where: {
          id: { in: nonCe4StudentIds },
          role: Role.STUDENT,
        },
      });

      return {
        deletedEditLogs: deletedEditLogs.count,
        deletedAttendance: deletedAttendance.count,
        deletedEventScopes: deletedEventScopes.count,
        deletedGroupMembers: deletedGroupMembers.count,
        deletedUsers: deletedUsers.count,
      };
    });

    console.log("Cleanup transaction completed:");
    console.log(`  - Removed EditLogs:          ${result.deletedEditLogs}`);
    console.log(`  - Removed AttendanceRecords: ${result.deletedAttendance}`);
    console.log(`  - Removed EventScopeItems:   ${result.deletedEventScopes}`);
    console.log(`  - Removed SavedGroupMembers: ${result.deletedGroupMembers}`);
    console.log(`  - Removed Non-CE4 Students:  ${result.deletedUsers}`);
  }

  // Verification audit of retained entities
  const [
    remainingCe4Students,
    remainingNonCe4Students,
    facultyCount,
    adminCount,
    hodCount,
    divisionCount,
    courseCount,
    timetableCount,
    sessionCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT, divisionId: ce4Division.id } }),
    prisma.user.count({
      where: {
        role: Role.STUDENT,
        OR: [{ divisionId: { not: ce4Division.id } }, { divisionId: null }],
      },
    }),
    prisma.user.count({ where: { role: Role.FACULTY } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { role: Role.HOD } }),
    prisma.division.count(),
    prisma.course.count(),
    prisma.timetableEntry.count(),
    prisma.session.count(),
  ]);

  console.log("\n=== Post-Cleanup Database Audit ===");
  console.log(`  - Retained CE 4 Students:    ${remainingCe4Students}`);
  console.log(`  - Remaining Non-CE4 Students:${remainingNonCe4Students}`);
  console.log(`  - Retained Faculty Members:  ${facultyCount}`);
  console.log(`  - Retained Admins / HODs:    ${adminCount} Admin, ${hodCount} HOD`);
  console.log(`  - Retained Divisions:        ${divisionCount}`);
  console.log(`  - Retained Courses:          ${courseCount}`);
  console.log(`  - Retained Timetable Entries:${timetableCount}`);
  console.log(`  - Retained Sessions:         ${sessionCount}`);
}

pruneToCe4()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err: unknown) => {
    console.error("Failed to prune database to CE 4:", err);
    await prisma.$disconnect();
    process.exit(1);
  });