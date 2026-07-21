import { PrismaClient, SessionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.findUnique({ where: { code: "CSE" } });
  if (!branch) throw new Error("Branch CSE not found");

  const faculty = await prisma.user.findFirst({ where: { role: "FACULTY", branchId: branch.id } });
  if (!faculty) throw new Error("No faculty found in CSE");

  const course = await prisma.course.findFirst({ where: { branchId: branch.id } });
  if (!course) throw new Error("No course found in CSE");

  // Create some sessions for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Clear existing sessions for today to prevent duplicates
  await prisma.session.deleteMany({
    where: { date: today }
  });

  await prisma.session.create({
    data: {
      courseId: course.id,
      facultyId: faculty.id,
      date: today,
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00 AM
      status: SessionStatus.SCHEDULED,
      isAdHoc: false,
    }
  });

  await prisma.session.create({
    data: {
      courseId: course.id,
      facultyId: faculty.id,
      date: today,
      startTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00 AM
      endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12:00 PM
      status: SessionStatus.ACTIVE,
      qrToken: "mock-qr-token-12345",
      isAdHoc: false,
    }
  });

  await prisma.session.create({
    data: {
      courseId: course.id,
      facultyId: faculty.id,
      date: today,
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3:00 PM
      status: SessionStatus.SCHEDULED,
      isAdHoc: true,
    }
  });

  console.log("Mock sessions for today created successfully!");
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
