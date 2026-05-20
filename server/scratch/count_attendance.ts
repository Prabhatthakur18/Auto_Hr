import prisma from '../src/config/db.js';

async function main() {
    try {
        const count = await prisma.attendance.count();
        console.log('--- Total attendance records:', count);
        const sample = await prisma.attendance.findMany({
            take: 5,
            include: { employee: true }
        });
        console.log('--- Sample records:', JSON.stringify(sample, null, 2));
    } catch (e) {
        console.error('Error counting records:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
