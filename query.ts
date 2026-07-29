import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.attendanceRecord.findMany({
    include: { student: true, session: true }
  });
  console.log('Total attendance records:', records.length);
  console.log(JSON.stringify(records.slice(0, 10), null, 2));

  const sessions = await prisma.session.findMany({
    include: { _count: { select: { attendanceRecords: true } } }
  });
  console.log('Total sessions:', sessions.length);
  console.log(JSON.stringify(sessions.slice(0, 5), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
