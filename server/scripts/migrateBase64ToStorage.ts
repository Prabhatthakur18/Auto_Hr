import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { putUploadFile, putPrivateUploadFile, extensionForMimeType } from '../src/utils/uploadStorage.js';

/**
 * One-time migration: converts existing base64/data: URL rows (created before the
 * Hostinger FTP storage driver existed) into real uploaded files, updating each row
 * to point at the new URL/storageKey instead of embedding the content inline.
 *
 * Safe to re-run — only touches rows that still look like inline base64 content.
 * Run with --apply to actually write; without it, only reports what would change.
 */

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
    if (!match) return null;
    return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function migrateHeroBanners() {
    const rows = await prisma.heroBanner.findMany({ where: { mediaUrl: { startsWith: 'data:' } } });
    console.log(`HeroBanner: ${rows.length} row(s) to migrate`);
    for (const row of rows) {
        const parsed = parseDataUrl(row.mediaUrl);
        if (!parsed) continue;
        console.log(`  #${row.id} (${parsed.buffer.length} bytes)`);
        if (!APPLY) continue;
        const extension = extensionForMimeType(parsed.mimeType);
        const url = await putUploadFile(`hero-banners/${randomUUID()}.${extension}`, parsed.buffer);
        await prisma.heroBanner.update({ where: { id: row.id }, data: { mediaUrl: url } });
    }
}

async function migrateLibraryDocuments() {
    const rows = await prisma.libraryDocument.findMany({ where: { contentUrl: { startsWith: 'data:' } } });
    console.log(`LibraryDocument: ${rows.length} row(s) to migrate`);
    for (const row of rows) {
        const parsed = parseDataUrl(row.contentUrl);
        if (!parsed) continue;
        console.log(`  #${row.id} (${parsed.buffer.length} bytes)`);
        if (!APPLY) continue;
        const extension = extensionForMimeType(parsed.mimeType);
        const url = await putUploadFile(`library/${randomUUID()}.${extension}`, parsed.buffer);
        await prisma.libraryDocument.update({ where: { id: row.id }, data: { contentUrl: url } });
    }
}

async function migrateCourseThumbnails() {
    const rows = await prisma.course.findMany({ where: { thumbnailUrl: { startsWith: 'data:' } } });
    console.log(`Course.thumbnailUrl: ${rows.length} row(s) to migrate`);
    for (const row of rows) {
        const parsed = row.thumbnailUrl ? parseDataUrl(row.thumbnailUrl) : null;
        if (!parsed) continue;
        console.log(`  #${row.id} (${parsed.buffer.length} bytes)`);
        if (!APPLY) continue;
        const extension = extensionForMimeType(parsed.mimeType);
        const url = await putUploadFile(`course-thumbnails/${randomUUID()}.${extension}`, parsed.buffer);
        await prisma.course.update({ where: { id: row.id }, data: { thumbnailUrl: url } });
    }
}

async function migrateLearningPathThumbnails() {
    const rows = await prisma.learningPath.findMany({ where: { thumbnailUrl: { startsWith: 'data:' } } });
    console.log(`LearningPath.thumbnailUrl: ${rows.length} row(s) to migrate`);
    for (const row of rows) {
        const parsed = row.thumbnailUrl ? parseDataUrl(row.thumbnailUrl) : null;
        if (!parsed) continue;
        console.log(`  #${row.id} (${parsed.buffer.length} bytes)`);
        if (!APPLY) continue;
        const extension = extensionForMimeType(parsed.mimeType);
        const url = await putUploadFile(`learning-path-thumbnails/${randomUUID()}.${extension}`, parsed.buffer);
        await prisma.learningPath.update({ where: { id: row.id }, data: { thumbnailUrl: url } });
    }
}

async function migrateCourseModules() {
    const rows = await prisma.courseModule.findMany({ where: { contentUrl: { startsWith: 'data:' } } });
    console.log(`CourseModule.contentUrl: ${rows.length} row(s) to migrate`);
    for (const row of rows) {
        const parsed = row.contentUrl ? parseDataUrl(row.contentUrl) : null;
        if (!parsed) continue;
        console.log(`  #${row.id} (${parsed.buffer.length} bytes)`);
        if (!APPLY) continue;
        const extension = extensionForMimeType(parsed.mimeType);
        const url = await putUploadFile(`course-modules/${randomUUID()}.${extension}`, parsed.buffer);
        await prisma.courseModule.update({ where: { id: row.id }, data: { contentUrl: url } });
    }
}

async function migrateAnnouncementMedia() {
    const rows = await prisma.announcementMedia.findMany({ where: { url: { startsWith: 'data:' } } });
    console.log(`AnnouncementMedia.url: ${rows.length} row(s) to migrate`);
    for (const row of rows) {
        const parsed = parseDataUrl(row.url);
        if (!parsed) continue;
        console.log(`  #${row.id} (${parsed.buffer.length} bytes)`);
        if (!APPLY) continue;
        const extension = extensionForMimeType(parsed.mimeType);
        const url = await putUploadFile(`announcements/${randomUUID()}.${extension}`, parsed.buffer);
        await prisma.announcementMedia.update({ where: { id: row.id }, data: { url } });
    }
}

async function migrateEmployeeDocuments() {
    const rows = await prisma.employeeDocument.findMany({ where: { storageKey: null } });
    console.log(`EmployeeDocument: ${rows.length} row(s) to migrate`);
    for (const row of rows) {
        if (!row.contentBase64) continue;
        const buffer = Buffer.from(row.contentBase64, 'base64');
        console.log(`  #${row.id} (${buffer.length} bytes, employee ${row.employeeId})`);
        if (!APPLY) continue;
        const extension = extensionForMimeType(row.mimeType);
        const storageKey = `employee-documents/${row.employeeId}/${randomUUID()}.${extension}`;
        await putPrivateUploadFile(storageKey, buffer);
        await prisma.employeeDocument.update({
            where: { id: row.id },
            data: { storageKey, contentBase64: null },
        });
    }
}

async function main() {
    console.log(APPLY ? 'Running migration (APPLY MODE)...\n' : 'Dry run — pass --apply to write changes.\n');

    await migrateHeroBanners();
    await migrateLibraryDocuments();
    await migrateCourseThumbnails();
    await migrateLearningPathThumbnails();
    await migrateCourseModules();
    await migrateAnnouncementMedia();
    await migrateEmployeeDocuments();

    console.log(APPLY ? '\nMigration complete.' : '\nDry run complete — no changes made.');
}

main()
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
