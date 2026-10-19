import { prisma } from "@/lib/prisma";
import { getExpectedStudentsForSession } from "@/lib/faculty-service";

export type RosterStatus = "PRESENT" | "ABSENT" | "LATE";

export interface RosterStudent {
  id: string;
  name: string;
  rollNo: string;
  status: RosterStatus | null;
  isFlagged: boolean;
  flagReason: string | null;
}

/** Full roster = expected students + anyone who marked outside the expected group. */
export async function buildSessionRoster(
  sessionId: string
): Promise<RosterStudent[]> {
  const [expectedStudents, records] = await Promise.all([
    getExpectedStudentsForSession(sessionId),
    prisma.attendanceRecord.findMany({
      where: { sessionId },
      select: {
        studentId: true,
        status: true,
        isFlagged: true,
        flagReason: true,
        student: {
          select: { id: true, name: true, enrollmentNo: true, email: true },
        },
      },
    }),
  ]);

  const recordMap = new Map(records.map((r) => [r.studentId, r]));
  const studentMap = new Map(expectedStudents.map((s) => [s.id, s]));

  for (const r of records) {
    if (r.student && !studentMap.has(r.studentId)) {
      studentMap.set(r.studentId, r.student);
    }
  }

  return Array.from(studentMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => {
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
}
