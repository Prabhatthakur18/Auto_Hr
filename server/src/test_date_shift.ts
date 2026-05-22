import prisma from './config/db.js';

async function main() {
    const month = '2026-01';
    const [year, mon] = month.split('-').map(Number);
    
    const start = new Date(year!, mon! - 1, 1);
    const end = new Date(year!, mon!, 0);
    
    console.log('Month:', month);
    console.log('start local:', start.toString());
    console.log('start ISO/UTC:', start.toISOString());
    console.log('end local:', end.toString());
    console.log('end ISO/UTC:', end.toISOString());

    // Let's check how Prisma queries with these dates:
    const queryResult = await prisma.attendance.findMany({
        where: {
            employeeId: 1,
            date: {
                gte: start,
                lte: end
            }
        },
        orderBy: { date: 'asc' }
    });
    console.log(`Prisma query with gte/lte returned ${queryResult.length} records.`);
    if (queryResult.length > 0) {
        console.log('First record date in DB:', queryResult[0]!.date.toISOString());
        console.log('Last record date in DB:', queryResult[queryResult.length - 1]!.date.toISOString());
    }

    // Now let's try querying using string-based date bounds to avoid timezone shift
    const startStr = `${month}-01`;
    const endStr = `${year}-${String(mon).padStart(2, '0')}-${new Date(year!, mon!, 0).getDate()}`;
    console.log(`String bounds: ${startStr} to ${endStr}`);

    const startUTC = new Date(`${startStr}T00:00:00.000Z`);
    const endUTC = new Date(`${endStr}T23:59:59.999Z`);
    console.log('startUTC:', startUTC.toISOString());
    console.log('endUTC:', endUTC.toISOString());

    const queryResult2 = await prisma.attendance.findMany({
        where: {
            employeeId: 1,
            date: {
                gte: startUTC,
                lte: endUTC
            }
        },
        orderBy: { date: 'asc' }
    });
    console.log(`Prisma query with UTC strings returned ${queryResult2.length} records.`);
    if (queryResult2.length > 0) {
        console.log('First record date (UTC query):', queryResult2[0]!.date.toISOString());
        console.log('Last record date (UTC query):', queryResult2[queryResult2.length - 1]!.date.toISOString());
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
