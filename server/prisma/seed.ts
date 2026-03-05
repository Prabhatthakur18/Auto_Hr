import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed script: creates HR admin + 24 employees from biometric master data.
 * Run with: npm run db:seed
 */
async function main() {
    console.log('🌱 Seeding database...\n');

    // ─── 1. Create HR admin user ───────────────────────────────
    const hrPassword = await bcrypt.hash('admin123', 12);
    const hrUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            passwordHash: hrPassword,
            role: 'HR',
        },
    });
    console.log(`✅ HR admin: ${hrUser.username} (role: ${hrUser.role})`);

    // ─── 2. Seed employees from biometric master data ──────────
    // BiometricId maps to the attendance portal's EnNo
    const employeesData = [
        { biometricId: 2, name: 'Rishi', department: 'Operations' },
        { biometricId: 3, name: 'Ankur Jain', department: 'Operations' },
        { biometricId: 4, name: 'Santosh Sharma', department: 'Operations' },
        { biometricId: 5, name: 'Gaurav', department: 'Operations' },
        { biometricId: 7, name: 'Gunjan', department: 'Operations' },
        { biometricId: 9, name: 'Aarti', department: 'Operations' },
        { biometricId: 10, name: 'Akansha Bajpai', department: 'Operations' },
        { biometricId: 11, name: 'Chirag Channa', department: 'Operations' },
        { biometricId: 14, name: 'Sumit', department: 'Operations' },
        { biometricId: 15, name: 'Sanjay Dwivedi', department: 'Operations' },
        { biometricId: 17, name: 'Himanshu Gandhi', department: 'Operations' },
        { biometricId: 19, name: 'Sandhya Jha', department: 'Operations' },
        { biometricId: 20, name: 'Vijaya', department: 'Operations' },
        { biometricId: 26, name: 'Saurabh', department: 'Operations' },
        { biometricId: 31, name: 'Anshika Singh', department: 'Operations' },
        { biometricId: 32, name: 'Prabhat', department: 'Engineering' },
        { biometricId: 34, name: 'Pankaj Vij', department: 'Operations' },
        { biometricId: 35, name: 'Kiran', department: 'Operations' },
        { biometricId: 36, name: 'Hardevi', department: 'Operations' },
        { biometricId: 37, name: 'Sadhana', department: 'Operations' },
        { biometricId: 38, name: 'Kanchani', department: 'Operations' },
        { biometricId: 40, name: 'Naman', department: 'Operations' },
        { biometricId: 41, name: 'Ashish Rai', department: 'Operations' },
        { biometricId: 42, name: 'Bharat Maheshwari', department: 'Engineering' },
    ];

    let created = 0;
    let skipped = 0;

    for (const emp of employeesData) {
        const existing = await prisma.employee.findUnique({
            where: { biometricId: emp.biometricId },
        });

        if (existing) {
            skipped++;
            continue;
        }

        await prisma.employee.create({
            data: {
                biometricId: emp.biometricId,
                name: emp.name,
                department: emp.department,
            },
        });
        created++;
    }

    console.log(`✅ Employees: ${created} created, ${skipped} skipped (already exist)`);

    // ─── 3. Create a test employee login ───────────────────────
    const prabhat = await prisma.employee.findUnique({
        where: { biometricId: 32 },
    });

    if (prabhat) {
        const empPassword = await bcrypt.hash('emp123', 12);
        await prisma.user.upsert({
            where: { username: 'prabhat' },
            update: {},
            create: {
                username: 'prabhat',
                passwordHash: empPassword,
                role: 'EMPLOYEE',
                employeeId: prabhat.id,
            },
        });
        console.log(`✅ Test employee login: prabhat / emp123`);
    }

    console.log('\n🌱 Seeding complete!');
    console.log('   Login as HR:       admin / admin123');
    console.log('   Login as Employee: prabhat / emp123');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
