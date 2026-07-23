import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface FacultySeed {
  code: string;
  name: string;
  email: string;
}

interface CourseSeed {
  code: string;
  name: string;
}

interface TimetableEntrySeed {
  day: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseCode: string;
  facultyCode: string;
  section: string;
  room: string;
}

function timeToDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

async function main() {
  console.log("Seeding database...");

  const dbPath = path.join(__dirname, "real_data.json");
  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8")) as {
    faculties: FacultySeed[];
    courses: CourseSeed[];
    entries: (TimetableEntrySeed & { division: string })[];
  };

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Organizational Hierarchy
  const branch = await prisma.branch.upsert({
    where: { code: "CSE" },
    update: {},
    create: {
      code: "CSE",
      name: "Computer Science and Engineering",
    },
  });

  const semester = await prisma.semester.upsert({
    where: { number_branchId: { number: 5, branchId: branch.id } }, // BE Third Year (Sem. V)
    update: {},
    create: {
      number: 5,
      branchId: branch.id,
    },
  });

  const division = await prisma.division.upsert({
    where: { name_semesterId: { name: "CE 1", semesterId: semester.id } },
    update: { name: "CE 1" },
    create: {
      name: "CE 1",
      semesterId: semester.id,
    },
  });

  const div2 = await prisma.division.upsert({
    where: { name_semesterId: { name: "CE 2", semesterId: semester.id } },
    update: { name: "CE 2" },
    create: {
      name: "CE 2",
      semesterId: semester.id,
    },
  });

  const div3 = await prisma.division.upsert({
    where: { name_semesterId: { name: "CE 3", semesterId: semester.id } },
    update: { name: "CE 3" },
    create: {
      name: "CE 3",
      semesterId: semester.id,
    },
  });

  const div4 = await prisma.division.upsert({
    where: { name_semesterId: { name: "CE 4", semesterId: semester.id } },
    update: { name: "CE 4" },
    create: {
      name: "CE 4",
      semesterId: semester.id,
    },
  });

  for (const div of [division, div2, div3, div4]) {
    await prisma.batch.upsert({
      where: { name_divisionId: { name: "A", divisionId: div.id } },
      update: {},
      create: { name: "A", divisionId: div.id },
    });
    await prisma.batch.upsert({
      where: { name_divisionId: { name: "B", divisionId: div.id } },
      update: {},
      create: { name: "B", divisionId: div.id },
    });
    await prisma.batch.upsert({
      where: { name_divisionId: { name: "C", divisionId: div.id } },
      update: {},
      create: { name: "C", divisionId: div.id },
    });
  }

  // 2. Create Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@college.edu" },
    update: {},
    create: {
      email: "admin@college.edu",
      name: "Admin User",
      role: Role.ADMIN,
      passwordHash,
      branchId: branch.id,
    },
  });

  const hod = await prisma.user.upsert({
    where: { email: "hod@college.edu" },
    update: {},
    create: {
      email: "hod@college.edu",
      name: "Head of Department",
      role: Role.HOD,
      passwordHash,
      branchId: branch.id,
    },
  });

  const facultyMap = new Map<string, string>();
  for (const f of dbData.faculties) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: { name: f.name },
      create: {
        email: f.email,
        name: f.name,
        role: Role.FACULTY,
        passwordHash,
        branchId: branch.id,
      },
    });
    facultyMap.set(f.code, user.id);
  }

  const courseMap = new Map<string, string>();
  for (const c of dbData.courses) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: {
        code: c.code,
        name: c.name,
        branchId: branch.id,
        credits: 3,
      },
    });
    courseMap.set(c.code, course.id);
  }

  await prisma.timetableEntry.deleteMany();

  const allDivisions = [division, div2, div3, div4];
  const divisionIdMap = { "CE 1": division.id, "CE 2": div2.id, "CE 3": div3.id, "CE 4": div4.id } as Record<string, string>;

  for (const div of allDivisions) {
    const divBatchA = await prisma.batch.findUnique({ where: { name_divisionId: { name: "A", divisionId: div.id } } });
    const divBatchB = await prisma.batch.findUnique({ where: { name_divisionId: { name: "B", divisionId: div.id } } });
    const divBatchC = await prisma.batch.findUnique({ where: { name_divisionId: { name: "C", divisionId: div.id } } });
    const localBatchMap = { A: divBatchA?.id, B: divBatchB?.id, C: divBatchC?.id } as Record<string, string>;

    const divEntries = dbData.entries.filter(e => e.division === div.name);

    for (const entry of divEntries) {
      const facultyId = facultyMap.get(entry.facultyCode);
      const courseId = courseMap.get(entry.courseCode);

      if (!facultyId || !courseId) continue;

      const isAll = entry.section === "ALL";
      const batchId = isAll ? null : localBatchMap[entry.section];

      await prisma.timetableEntry.create({
        data: {
          dayOfWeek: entry.dayOfWeek,
          startTime: timeToDate(entry.startTime),
          endTime: timeToDate(entry.endTime),
          courseId,
          facultyId,
          room: entry.room,
          divisionId: div.id,
          batchId,
        },
      });
    }
  }

  const studentBatchA = await prisma.batch.findUnique({
    where: { name_divisionId: { name: "A", divisionId: division.id } }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@college.edu" },
    update: {},
    create: {
      email: "student@college.edu",
      name: "Student User",
      role: Role.STUDENT,
      passwordHash,
      branchId: branch.id,
      semesterId: semester.id,
      divisionId: division.id,
      batchId: studentBatchA?.id,
    },
  });

  // Seed default system config
  const defaultConfig = [
    { key: "slots_per_day", value: "6" },
    { key: "lan_restriction_enabled", value: "false" },
    { key: "lan_allowed_ips", value: "" },
    { key: "academic_year", value: new Date().getFullYear().toString() },
    { key: "min_attendance_percentage", value: "75" },
    { key: "qr_refresh_interval", value: "3" },
  ];

  for (const cfg of defaultConfig) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: { key: cfg.key, value: cfg.value },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
