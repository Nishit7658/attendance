import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

  const dbPath = path.join(__dirname, "db.json");
  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf-8")) as {
    faculty: FacultySeed[];
    courses: CourseSeed[];
    timetableEntries: TimetableEntrySeed[];
  };

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@college.edu" },
    update: {},
    create: {
      email: "admin@college.edu",
      name: "Admin User",
      role: Role.ADMIN,
      passwordHash,
      department: "Administration",
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
      department: "Computer Science",
    },
  });

  const facultyMap = new Map<string, string>();
  for (const f of dbData.faculty) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: { name: f.name },
      create: {
        email: f.email,
        name: f.name,
        role: Role.FACULTY,
        passwordHash,
        department: "Computer Science",
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
        department: "Computer Science",
        credits: 3,
      },
    });
    courseMap.set(c.code, course.id);
  }

  await prisma.timetableEntry.deleteMany();

  for (const entry of dbData.timetableEntries) {
    const facultyId = facultyMap.get(entry.facultyCode);
    const courseId = courseMap.get(entry.courseCode);

    if (!facultyId) {
      console.warn(`Skipping timetable entry — unknown faculty code: ${entry.facultyCode}`);
      continue;
    }
    if (!courseId) {
      console.warn(`Skipping timetable entry — unknown course code: ${entry.courseCode}`);
      continue;
    }

    await prisma.timetableEntry.create({
      data: {
        dayOfWeek: entry.dayOfWeek,
        startTime: timeToDate(entry.startTime),
        endTime: timeToDate(entry.endTime),
        courseId,
        facultyId,
        room: entry.room,
        section: entry.section,
      },
    });
  }

  const student = await prisma.user.upsert({
    where: { email: "student@college.edu" },
    update: {},
    create: {
      email: "student@college.edu",
      name: "Student User",
      role: Role.STUDENT,
      passwordHash,
      department: "Computer Science",
    },
  });

  console.log(`Seeded ${dbData.faculty.length} faculty members`);
  console.log(`Seeded ${dbData.courses.length} courses`);
  console.log(`Seeded ${dbData.timetableEntries.length} timetable entries`);
  console.log("Admin:", admin.email);
  console.log("HOD:", hod.email);
  console.log("Student:", student.email);
  console.log("All passwords: password123");
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
