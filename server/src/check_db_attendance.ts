import prisma from './config/db.js';

async function main() {
  const count = await prisma.attendance.count();
  console.log(`Total attendance records: ${count}`);

  const records = await prisma.attendance.findMany({
    orderBy: { date: 'desc' },
    take: 50,
    select: { date: true, employeeId: true }
  });
  console.log('Latest 50 records in DB:', records.map(r => ({
    employeeId: r.employeeId,
    date: r.date.toISOString().split('T')[0]
  })));

  // Group by month
  const allRecs = await prisma.attendance.findMany({
    select: { date: true }
  });
  const counts: Record<string, number> = {};
  for (const r of allRecs) {
    const month = r.date.toISOString().split('T')[0]!.slice(0, 7);
    counts[month] = (counts[month] || 0) + 1;
  }
  console.log('Stored records per month in DB:', counts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
