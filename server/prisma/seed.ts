import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { masterEmployees } from '../src/data/employeeMaster.js';

const prisma = new PrismaClient();

/**
 * Seed script: creates HR admin + 24 employees from biometric master data.
 * Run with: npm run db:seed
 */
async function main() {
    console.log('Seeding database...\n');

    // 1. Create or update an employee profile for the local HR admin.
    const adminEmployee = await prisma.employee.upsert({
        where: { email: 'admin@autohr.local' },
        update: {
            name: 'Admin HR',
            department: 'HR',
            position: 'HR Admin',
            employeeType: 'Full-time',
            isActive: true,
        },
        create: {
            name: 'Admin HR',
            email: 'admin@autohr.local',
            department: 'HR',
            position: 'HR Admin',
            employeeType: 'Full-time',
        },
    });
    console.log(`Created HR admin employee: ${adminEmployee.name}`);

    // 2. Create or update the HR admin user and link it to that employee.
    const hrPassword = await bcrypt.hash('admin123', 12);
    const hrUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            role: 'HR',
            employeeId: adminEmployee.id,
            isActive: true,
        },
        create: {
            username: 'admin',
            passwordHash: hrPassword,
            role: 'HR',
            employeeId: adminEmployee.id,
        },
    });
    console.log(`Created HR admin: ${hrUser.username} (role: ${hrUser.role})`);

    // 3. Seed employees from biometric master data.
    let created = 0;
    let skipped = 0;

    for (const emp of masterEmployees) {
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

    console.log(`Employees: ${created} created, ${skipped} skipped (already exist)`);

    // 4. Create a test employee login.
    const prabhat = await prisma.employee.findUnique({
        where: { biometricId: 32 },
    });

    if (prabhat) {
        const empPassword = await bcrypt.hash('emp123', 12);
        await prisma.user.upsert({
            where: { username: 'prabhat' },
            update: {
                employeeId: prabhat.id,
                isActive: true,
            },
            create: {
                username: 'prabhat',
                passwordHash: empPassword,
                role: 'EMPLOYEE',
                employeeId: prabhat.id,
            },
        });
        console.log('Test employee login: prabhat / emp123');
    }

    console.log('\nSeeding complete!');
    console.log('   Login as HR:       admin / admin123');
    console.log('   Login as Employee: prabhat / emp123');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
