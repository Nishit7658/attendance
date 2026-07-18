import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const timeSlots = [
  { s: "1970-01-01T09:35:00.000+05:30", e: "1970-01-01T10:30:00.000+05:30" }, // 0
  { s: "1970-01-01T10:30:00.000+05:30", e: "1970-01-01T11:30:00.000+05:30" }, // 1
  { s: "1970-01-01T12:15:00.000+05:30", e: "1970-01-01T13:15:00.000+05:30" }, // 2
  { s: "1970-01-01T13:15:00.000+05:30", e: "1970-01-01T14:15:00.000+05:30" }, // 3
  { s: "1970-01-01T14:30:00.000+05:30", e: "1970-01-01T15:30:00.000+05:30" }, // 4
  { s: "1970-01-01T15:30:00.000+05:30", e: "1970-01-01T16:25:00.000+05:30" }, // 5
];

const faculties = [
  { code: "NRS", name: "Dr. Neha Soni" },
  { code: "JBS", name: "Prof. Jayna Shah" },
  { code: "HVC", name: "Prof. Hetal Chauhan" },
  { code: "DJP", name: "Prof. Divya Parmar" },
  { code: "MPP", name: "Dr. Minal Patel" },
  { code: "PJD", name: "Prof. Prexa Desai" },
  { code: "MHS", name: "Prof. Milind Shah" },
  { code: "PAP", name: "Prof. Priyanka Patel" },
  { code: "SMP", name: "Dr. Shrina Patel" },
  { code: "JP", name: "Prof. Jeenal Patel" },
  { code: "MCJ", name: "Prof. Mital Joshi" },
  { code: "NSV", name: "Prof. Nisha Velani" },
  { code: "PVB", name: "Prof. Parul Bakaraniya" },
  { code: "RBP", name: "Prof. Rashmin Prajapati" },
  { code: "NBS", name: "Prof. Nidhi Shah" },
  { code: "BMJ", name: "Dr. Barkha Joshi" },
  { code: "KNU", name: "Prof. Keyur Upadhyay" },
  { code: "SDB", name: "Prof. Swati Bopaliya" },
  { code: "KSS", name: "Prof. Keyur Suthar" },
  { code: "BYP", name: "Dr. Brijesh Panchal" },
  { code: "HJB", name: "Prof. Himani Bhatt" },
  { code: "AMP", name: "Prof. Abhishek Patel" },
  { code: "MMP", name: "Prof. MMP" }, // Assuming based on CE 3 Sat 12:15
  { code: "LIB", name: "Librarian" }, // For Library slots
];

const courses = [
  { code: "SS", name: "System Software" },
  { code: "PDS", name: "Python for Data Science" },
  { code: "DM", name: "Data Mining technique" },
  { code: "MI", name: "Microprocessor and Interfacing" },
  { code: "CN", name: "Computer Networks" },
  { code: "PM", name: "Project Management" },
  { code: "WAD", name: "Web Application And Development" },
  { code: "LIBRARY", name: "Library Session" },
];

// Format: "DayOfWeek | StartSlot | EndSlot | CourseCode | Batch | Room | FacultyCode"
// DayOfWeek: 1=Mon, 2=Tue, ... 6=Sat
const divisionsData = [
  {
    name: "CE 1", room: "305",
    entries: [
      // Mon
      "1|0|1|SS|A|F1|NRS", "1|0|1|PDS|B|F2|JBS", "1|0|1|PDS|C|F3|HVC",
      "1|2|2|DM|ALL|305|PAP", "1|3|3|CN|ALL|305|MPP", "1|4|4|MI|ALL|305|PJD", "1|5|5|LIBRARY|ALL|LIB|LIB",
      // Tue
      "2|0|1|PDS|A|F4|JBS", "2|0|1|SS|B|S3|NRS", "2|0|1|CN|C|F2|DJP",
      "2|2|3|DM|A|F2|PAP", "2|2|3|MI|B|F1|PJD", "2|2|3|SS|C|S3|NRS",
      "2|4|4|CN|ALL|305|MPP", "2|5|5|LIBRARY|ALL|LIB|LIB",
      // Wed
      "3|0|0|SS|ALL|305|NRS", "3|1|1|PM|ALL|305|MHS", "3|2|2|PDS|ALL|305|JBS", "3|3|3|DM|ALL|305|PAP",
      "3|4|5|MI|A|F6|PJD", "3|4|5|CN|B|F4|MPP", "3|4|5|DM|C|S3|JP",
      // Thu
      "4|0|0|PM|ALL|305|MHS", "4|1|1|CN|ALL|305|MPP", "4|2|2|MI|ALL|305|PJD", "4|3|3|DM|ALL|305|PAP",
      "4|4|5|LIBRARY|ALL|LIB|LIB",
      // Fri
      "5|0|0|SS|ALL|305|NRS", "5|1|1|PDS|ALL|305|JBS",
      "5|2|3|CN|A|F1|MPP", "5|2|3|DM|B|G3|JP", "5|2|3|MI|C|F4|PJD",
      "5|4|5|LIBRARY|ALL|LIB|LIB",
      // Sat
      "6|0|0|MI|ALL|305|PJD", "6|1|1|SS|ALL|305|NRS", "6|2|2|PDS|ALL|305|JBS", "6|3|3|PM|ALL|305|MHS",
      "6|4|5|LIBRARY|ALL|LIB|LIB",
    ]
  },
  {
    name: "CE 2", room: "306",
    entries: [
      // Mon
      "1|0|0|SS|ALL|306|MHS", "1|1|1|DM|ALL|306|SMP", "1|2|2|PM|ALL|306|JP", "1|3|3|LIBRARY|ALL|LIB|LIB",
      "1|4|5|SS|A|F1|MHS", "1|4|5|CN|B|F2|MCJ", "1|4|5|MI|C|F6|PVB",
      // Tue
      "2|0|0|MI|ALL|306|PVB", "2|1|1|CN|ALL|306|MCJ", "2|2|2|DM|ALL|306|SMP", "2|3|3|SS|ALL|306|MHS",
      "2|4|4|PDS|ALL|306|RBP", "2|5|5|LIBRARY|ALL|LIB|LIB",
      // Wed
      "3|0|1|MI|A|S2|NSV", "3|0|1|DM|B|F2|SMP", "3|0|1|PDS|C|F4|HVC",
      "3|2|2|PM|ALL|306|JP", "3|3|5|LIBRARY|ALL|LIB|LIB",
      // Thu
      "4|0|0|CN|ALL|306|MCJ", "4|1|1|MI|ALL|306|PVB", "4|2|2|PDS|ALL|306|RBP", "4|3|3|PM|ALL|306|JP",
      "4|4|5|DM|A|F1|SMP", "4|4|5|PDS|B|S3|HVC", "4|4|5|DM|C|S2|BMJ",
      // Fri
      "5|0|0|CN|ALL|306|MCJ", "5|1|1|MI|ALL|306|PVB", "5|2|2|SS|ALL|306|MHS", "5|3|3|DM|ALL|306|SMP",
      "5|4|5|PDS|A|F3|RBP", "5|4|5|SS|B|F4|MHS", "5|4|5|CN|C|F1|MCJ",
      // Sat
      "6|0|1|CN|A|F1|MCJ", "6|0|1|MI|B|G3|PVB", "6|0|1|SS|C|F2|MHS",
      "6|2|2|PDS|ALL|306|RBP", "6|3|5|LIBRARY|ALL|LIB|LIB",
    ]
  },
  {
    name: "CE 3", room: "207",
    entries: [
      // Mon
      "1|0|0|PDS|ALL|207|KSS", "1|1|1|WAD|ALL|207|NBS", "1|2|2|PM|ALL|207|PJD", "1|3|3|MI|ALL|207|KNU",
      "1|4|5|LIBRARY|ALL|LIB|LIB",
      // Tue
      "2|0|1|DM|A|S2|BMJ", "2|0|1|CN|B|F1|SDB", "2|0|1|WAD|C|F5|NBS",
      "2|2|2|PDS|ALL|207|KSS", "2|3|3|MI|ALL|207|KNU", "2|4|4|CN|ALL|207|SDB", "2|5|5|LIBRARY|ALL|LIB|LIB",
      // Wed
      "3|0|0|PDS|ALL|207|KSS", "3|1|1|CN|ALL|207|SDB",
      "3|2|3|MI|A|F5|KNU", "3|2|3|DM|B|S4|BMJ", "3|2|3|SS|C|S3|HVC",
      "3|4|5|CN|A|F1|SDB", "3|4|5|PDS|B|F5|KSS", "3|4|5|MI|C|F3|NSV",
      // Thu
      "4|0|0|MI|ALL|207|KNU", "4|1|1|WAD|ALL|207|NBS", "4|2|2|SS|ALL|207|HVC", "4|3|3|PM|ALL|207|MMP",
      "4|4|5|LIBRARY|ALL|LIB|LIB",
      // Fri
      "5|0|0|WAD|ALL|207|NBS", "5|1|1|SS|ALL|207|HVC",
      "5|2|3|SS|A|F2|HVC", "5|2|3|MI|B|S4|KNU", "5|2|3|PDS|C|F5|KSS",
      "5|4|5|PDS|A|S4|KSS", "5|4|5|SS|B|S3|HVC", "5|4|5|CN|C|F6|SDB",
      // Sat
      "6|0|0|SS|ALL|207|HVC", "6|1|1|CN|ALL|207|SDB", "6|2|2|PM|ALL|207|MMP", "6|3|5|LIBRARY|ALL|LIB|LIB"
    ]
  },
  {
    name: "CE 4", room: "306-A",
    entries: [
      // Mon
      "1|0|0|PM|ALL|306-A|BYP", "1|1|1|WAD|ALL|306-A|NBS", "1|2|2|CN|ALL|306-A|DJP", "1|3|3|MI|ALL|306-A|NSV",
      "1|4|4|SS|ALL|306-A|HJB", "1|5|5|LIBRARY|ALL|LIB|LIB",
      // Tue
      "2|0|0|MI|ALL|306-A|NSV", "2|1|1|SS|ALL|306-A|HJB",
      "2|2|3|CN|A|F4|DJP", "2|2|3|WAD|B|F5|NBS", "2|2|3|PDS|C|F3|AMP",
      "2|4|5|SS|A|F6|MHS", "2|4|5|SS|B|S4|HJB", "2|4|5|MI|C|F1|KNU",
      // Wed
      "3|0|0|PDS|ALL|306-A|AMP", "3|1|1|SS|ALL|306-A|HJB",
      "3|2|3|PDS|A|F4|AMP", "3|2|3|CN|B|F1|DJP", "3|2|3|SS|C|S2|HJB",
      "3|4|4|PM|ALL|306-A|BYP", "3|5|5|LIBRARY|ALL|LIB|LIB",
      // Thu
      "4|0|0|MI|ALL|306-A|NSV", "4|1|1|WAD|ALL|306-A|NBS", "4|2|2|CN|ALL|306-A|DJP",
      "4|3|5|LIBRARY|ALL|LIB|LIB",
      // Fri
      "5|0|0|WAD|ALL|306-A|NBS", "5|1|1|PDS|ALL|306-A|AMP", "5|2|2|CN|ALL|306-A|DJP",
      "5|3|3|LIBRARY|ALL|LIB|LIB",
      "5|4|5|WAD|A|S2|NBS", "5|4|5|PDS|B|F5|AMP", "5|4|5|CN|C|F2|DJP",
      // Sat
      "6|0|0|PM|ALL|306-A|BYP", "6|1|1|PDS|ALL|306-A|AMP",
      "6|2|3|MI|A|S4|PVB", "6|2|3|MI|B|F6|NSV", "6|2|3|WAD|C|F5|NBS",
      "6|4|5|LIBRARY|ALL|LIB|LIB"
    ]
  }
];

async function main() {
  console.log("Seeding CE 1-4 Timetables...");

  const branch = await prisma.branch.upsert({
    where: { code: "CSE" },
    update: {},
    create: { code: "CSE", name: "Computer Science and Engineering" },
  });

  const semester = await prisma.semester.upsert({
    where: { number_branchId: { number: 5, branchId: branch.id } },
    update: {},
    create: { number: 5, branchId: branch.id },
  });

  // Seed faculties
  const passwordHash = await bcrypt.hash("password123", 10);
  const facultyMap = new Map<string, string>();
  for (const f of faculties) {
    const user = await prisma.user.upsert({
      where: { email: `${f.code.toLowerCase()}@college.edu` },
      update: { name: f.name },
      create: {
        email: `${f.code.toLowerCase()}@college.edu`,
        name: f.name,
        role: Role.FACULTY,
        passwordHash,
        branchId: branch.id,
      },
    });
    facultyMap.set(f.code, user.id);
  }

  // Seed courses
  const courseMap = new Map<string, string>();
  for (const c of courses) {
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

  // Ensure DB is clean of old entries for these divisions
  await prisma.timetableEntry.deleteMany();

  // Process divisions
  for (const divData of divisionsData) {
    const division = await prisma.division.upsert({
      where: { name_semesterId: { name: divData.name, semesterId: semester.id } },
      update: {},
      create: { name: divData.name, semesterId: semester.id },
    });

    const batchA = await prisma.batch.upsert({
      where: { name_divisionId: { name: "A", divisionId: division.id } },
      update: {},
      create: { name: "A", divisionId: division.id },
    });
    const batchB = await prisma.batch.upsert({
      where: { name_divisionId: { name: "B", divisionId: division.id } },
      update: {},
      create: { name: "B", divisionId: division.id },
    });
    const batchC = await prisma.batch.upsert({
      where: { name_divisionId: { name: "C", divisionId: division.id } },
      update: {},
      create: { name: "C", divisionId: division.id },
    });
    const batchMap: Record<string, string> = { A: batchA.id, B: batchB.id, C: batchC.id };

    // Insert entries
    for (const entryStr of divData.entries) {
      const [day, startIdx, endIdx, cCode, batch, room, fCode] = entryStr.split("|");
      
      const courseId = courseMap.get(cCode);
      const facultyId = facultyMap.get(fCode);
      
      if (!courseId || !facultyId) {
        console.error(`Missing map for ${cCode} or ${fCode}`);
        continue;
      }

      await prisma.timetableEntry.create({
        data: {
          dayOfWeek: parseInt(day),
          startTime: new Date(timeSlots[parseInt(startIdx)].s),
          endTime: new Date(timeSlots[parseInt(endIdx)].e),
          courseId,
          facultyId,
          room,
          section: batch === "ALL" ? "ALL" : batch,
          divisionId: division.id,
          batchId: batch === "ALL" ? null : batchMap[batch],
        }
      });
    }
  }

  console.log("CE 1-4 Timetables Seeded Successfully!");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
