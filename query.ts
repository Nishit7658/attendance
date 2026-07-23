import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const entries = await prisma.timetableEntry.findMany({
    include: { division: true, course: true, batch: true }
  });
  console.log('Total entries:', entries.length);
  console.log(JSON.stringify(entries.slice(0, 3), null, 2));

  const divisions = await prisma.division.findMany();
  console.log('Divisions:', JSON.stringify(divisions, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
