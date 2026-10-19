/**
 * Prune the database down to Division CE 4 students only.
 *
 * Removes: student accounts in CE 1, CE 2, CE 3 and their attendance records
 *          (EditLogs cascade from AttendanceRecord; SavedGroupMember and
 *          EventScopeItem cascade from User).
 * Keeps:   faculty, HOD, admin, courses, branches, semesters, divisions,
 *          batches, timetable entries and sessions.
 *
 * Usage (dry run is the default – nothing is written):
 *   npx tsx scripts/prune_to_ce4.ts
 *   npx tsx scripts/prune_to_ce4.ts --apply
 *
 * BACK UP THE DATABASE BEFORE USING --apply.
 */
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_DIVISION = "CE 4";
const REMOVE_DIVISIONS = ["CE 1", "CE 2", "CE 3"];
const APPLY = process.argv.includes("--apply");

async function countByRole(): Promise<Record<Role, number>> {
  const grouped = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
  const result: Record<Role, number> = { STUDENT: 0, FACULTY: 0, HOD: 0, ADMIN: 0 };
  for (const g of grouped) result[g.role] = g._count._all;
  return result;
}

async function main(): Promise<void> {
  console.log(APPLY ? "MODE: APPLY (writes enabled)" : "MODE: DRY RUN (use --apply to delete)");

  const keepDivisions = await prisma.division.findMany({ where: { name: KEEP_DIVISION } });
  if (keepDivisions.length === 0) {
    throw new Error(`Division "${KEEP_DIVISION}" not found – refusing to continue.`);
  }
  const keepDivisionIds = keepDivisions.map((d) => d.id);

  const targets = await prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      division: { name: { in: REMOVE_DIVISIONS } },
      NOT: { divisionId: { in: keepDivisionIds } },
    },
    select: { id: true, name: true, enrollmentNo: true, division: { select: { name: true } } },
  });
  const targetIds = targets.map((t) => t.id);

  const rolesBefore = await countByRole();
  const ce4Students = await prisma.user.count({
    where: { role: Role.STUDENT, divisionId: { in: keepDivisionIds } },
  });
  const unassigned = await prisma.user.count({
    where: { role: Role.STUDENT, divisionId: null },
  });

  console.log("\nBefore:", rolesBefore, `| CE 4 students: ${ce4Students}`);
  if (unassigned > 0) {
    console.log(`Note: ${unassigned} student(s) have no division; they are left untouched.`);
  }
  console.log(`Students to delete: ${targets.length}`);
  for (const d of REMOVE_DIVISIONS) {
    console.log(`  ${d}: ${targets.filter((t) => t.division?.name === d).length}`);
  }

  if (targetIds.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  // Safety checks: never destroy data that belongs to retained users.
  const [crossMarked, crossEdited, ownsEvents, ownsGroups] = await Promise.all([
    prisma.attendanceRecord.count({
      where: { markedById: { in: targetIds }, studentId: { notIn: targetIds } },
    }),
    prisma.editLog.count({
      where: {
        editedById: { in: targetIds },
        attendanceRecord: { studentId: { notIn: targetIds } },
      },
    }),
    prisma.event.count({ where: { createdById: { in: targetIds } } }),
    prisma.savedGroup.count({ where: { createdById: { in: targetIds } } }),
  ]);

  const blockers: string[] = [];
  if (crossMarked > 0) blockers.push(`${crossMarked} retained attendance record(s) were marked by a student being removed`);
  if (crossEdited > 0) blockers.push(`${crossEdited} retained edit log(s) were authored by a student being removed`);
  if (ownsEvents > 0) blockers.push(`${ownsEvents} event(s) were created by a student being removed`);
  if (ownsGroups > 0) blockers.push(`${ownsGroups} saved group(s) were created by a student being removed`);
  if (blockers.length > 0) {
    throw new Error(`Aborting – foreign keys would break:\n - ${blockers.join("\n - ")}`);
  }

  const recordCount = await prisma.attendanceRecord.count({
    where: { studentId: { in: targetIds } },
  });
  console.log(`Attendance records to delete: ${recordCount}`);

  if (!APPLY) {
    console.log("\nDry run complete. Re-run with --apply to perform the deletion.");
    return;
  }

  // One atomic batch, children first. Chunked to keep IN lists small.
  const CHUNK = 500;
  const ops = [];
  for (let i = 0; i < targetIds.length; i += CHUNK) {
    const ids = targetIds.slice(i, i + CHUNK);
    ops.push(prisma.attendanceRecord.deleteMany({ where: { studentId: { in: ids } } }));
  }
  for (let i = 0; i < targetIds.length; i += CHUNK) {
    const ids = targetIds.slice(i, i + CHUNK);
    ops.push(prisma.user.deleteMany({ where: { id: { in: ids }, role: Role.STUDENT } }));
  }
  await prisma.$transaction(ops);

  const rolesAfter = await countByRole();
  const ce4After = await prisma.user.count({
    where: { role: Role.STUDENT, divisionId: { in: keepDivisionIds } },
  });
  console.log("\nAfter:", rolesAfter, `| CE 4 students: ${ce4After}`);

  if (
    rolesAfter.FACULTY !== rolesBefore.FACULTY ||
    rolesAfter.HOD !== rolesBefore.HOD ||
    rolesAfter.ADMIN !== rolesBefore.ADMIN ||
    ce4After !== ce4Students
  ) {
    throw new Error("Post-check failed: a retained account count changed. Restore from backup.");
  }
  console.log("Done. Faculty, HOD, admin and CE 4 students are unchanged.");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
