const {PrismaClient} = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function test() {
  console.log('=== DB Connectivity OK ===');
  
  const users = await p.user.findMany({ select: { id:true, name:true, email:true, role:true, enrollmentNo:true }, take: 6 });
  users.forEach(u => console.log(u.role, '|', u.name, '|', u.email, '| enroll:', u.enrollmentNo));
  
  console.log('\n=== Courses ===');
  const courses = await p.course.findMany({ select: { id:true, code:true, name:true } });
  courses.forEach(c => console.log(c.code, '-', c.name));
  
  console.log('\n=== Active Sessions ===');
  const sessions = await p.session.findMany({ where: { status: 'ACTIVE' } });
  console.log('Active sessions:', sessions.length);
  
  console.log('\n=== Ended Sessions ===');
  const ended = await p.session.findMany({ where: { status: 'ENDED' }, include: { course: true }, take: 3 });
  for (const s of ended) {
    const recs = await p.attendanceRecord.count({ where: { sessionId: s.id } });
    console.log(s.id.substring(0,8), s.course.code, '| records:', recs);
  }
  
  console.log('\n=== Faculty ===');
  const faculty = await p.user.findMany({ where: { role: 'FACULTY' }, select: { name:true, email:true }, take: 4 });
  faculty.forEach(f => console.log(f.name, '|', f.email));
  
  console.log('\n=== Students sample ===');
  const students = await p.user.findMany({ where: { role: 'STUDENT' }, select: { name:true, email:true, enrollmentNo:true }, take: 4 });
  students.forEach(s => console.log(s.name, '|', s.email, '| enroll:', s.enrollmentNo));
  
  await p.$disconnect();
  console.log('\n=== ALL TESTS PASSED ===');
}

test().catch(e => { console.error('ERROR:', e.message); p.$disconnect(); process.exit(1); });
