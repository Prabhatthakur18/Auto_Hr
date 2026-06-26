import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Same PNG used as the app's header logo (frontend/src/images/autoform-logo.png) — kept in sync
// manually since the server has no build-time access to the frontend's asset pipeline.
const LOGO_PATH = path.resolve(__dirname, '../assets/autoform-logo.png');

function buildCertificateNumber(courseId: number, employeeId: number, moduleId?: number): string {
    const scope = moduleId ? `M${moduleId}` : 'C';
    return `CERT-${scope}-${courseId}-${employeeId}-${Date.now().toString(36).toUpperCase()}`;
}

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const CENTER_X = PAGE_WIDTH / 2;

const ORANGE = rgb(0.96, 0.4, 0.09);
const ORANGE_LIGHT = rgb(0.98, 0.85, 0.7);
const SLATE = rgb(0.12, 0.16, 0.22);
const SLATE_LIGHT = rgb(0.45, 0.5, 0.56);
const GOLD = rgb(0.7, 0.55, 0.15);
const WHITE = rgb(1, 1, 1);

function centeredText(page: PDFPage, text: string, y: number, size: number, font: PDFFont, color = SLATE): void {
    page.drawText(text, {
        x: CENTER_X - font.widthOfTextAtSize(text, size) / 2,
        y,
        size,
        font,
        color,
    });
}

async function generateCertificatePdf(options: {
    learnerName: string;
    courseTitle: string;
    moduleTitle: string | null;
    certificateNumber: string;
    completedAt: Date;
    gradeLabel?: string | null;
}): Promise<Uint8Array> {
    const { learnerName, courseTitle, moduleTitle, certificateNumber, completedAt, gradeLabel } = options;

    const doc = await PDFDocument.create();
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    const heading = await doc.embedFont(StandardFonts.HelveticaBold);
    const body = await doc.embedFont(StandardFonts.Helvetica);
    const script = await doc.embedFont(StandardFonts.HelveticaOblique);

    // Background + decorative border (double rule, on-brand orange with a thin gold inner accent)
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: WHITE });
    page.drawRectangle({ x: 16, y: 16, width: PAGE_WIDTH - 32, height: PAGE_HEIGHT - 32, borderColor: ORANGE, borderWidth: 4 });
    page.drawRectangle({ x: 30, y: 30, width: PAGE_WIDTH - 60, height: PAGE_HEIGHT - 60, borderColor: GOLD, borderWidth: 1 });
    // Corner accents for a less "boxed-in" feel than a single rectangle
    const cornerSize = 26;
    for (const [cx, cy, dx, dy] of [[30, 30, 1, 1], [PAGE_WIDTH - 30, 30, -1, 1], [30, PAGE_HEIGHT - 30, 1, -1], [PAGE_WIDTH - 30, PAGE_HEIGHT - 30, -1, -1]] as const) {
        page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + cornerSize * dx, y: cy }, thickness: 3, color: ORANGE });
        page.drawLine({ start: { x: cx, y: cy }, end: { x: cx, y: cy + cornerSize * dy }, thickness: 3, color: ORANGE });
    }

    // Logo
    try {
        const logoBytes = await readFile(LOGO_PATH);
        const logoImage = await doc.embedPng(logoBytes);
        const logoWidth = 130;
        const logoHeight = logoImage.height * (logoWidth / logoImage.width);
        page.drawImage(logoImage, { x: CENTER_X - logoWidth / 2, y: PAGE_HEIGHT - 95, width: logoWidth, height: logoHeight });
    } catch {
        // Logo asset missing — certificate still generates, just without the mark. Non-fatal by design.
    }

    centeredText(page, 'AUTOFORM INDIA', PAGE_HEIGHT - 115, 9, heading, SLATE_LIGHT);
    centeredText(page, moduleTitle ? 'Certificate of Module Completion' : 'Certificate of Completion', PAGE_HEIGHT - 155, 26, heading, SLATE);

    page.drawLine({ start: { x: CENTER_X - 60, y: PAGE_HEIGHT - 168 }, end: { x: CENTER_X + 60, y: PAGE_HEIGHT - 168 }, thickness: 1.5, color: ORANGE });

    centeredText(page, 'This certifies that', PAGE_HEIGHT - 205, 13, body, SLATE_LIGHT);
    centeredText(page, learnerName, PAGE_HEIGHT - 245, 30, script, ORANGE);

    if (moduleTitle) {
        centeredText(page, 'has successfully completed the module', PAGE_HEIGHT - 280, 13, body, SLATE_LIGHT);
        centeredText(page, moduleTitle, PAGE_HEIGHT - 312, 19, heading, SLATE);
        centeredText(page, `part of the course "${courseTitle}"`, PAGE_HEIGHT - 335, 11, body, SLATE_LIGHT);
    } else {
        centeredText(page, 'has successfully completed the course', PAGE_HEIGHT - 280, 13, body, SLATE_LIGHT);
        centeredText(page, courseTitle, PAGE_HEIGHT - 315, 22, heading, SLATE);
    }

    if (gradeLabel) {
        const badgeY = PAGE_HEIGHT - 365;
        const badgeText = `Grade: ${gradeLabel}`;
        const badgeWidth = heading.widthOfTextAtSize(badgeText, 12) + 28;
        page.drawRectangle({
            x: CENTER_X - badgeWidth / 2,
            y: badgeY - 8,
            width: badgeWidth,
            height: 22,
            color: ORANGE_LIGHT,
            borderColor: ORANGE,
            borderWidth: 1,
        });
        centeredText(page, badgeText, badgeY - 2, 12, heading, ORANGE);
    }

    const dateStr = completedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // Signature line + footer block
    const footerY = 95;
    page.drawLine({ start: { x: CENTER_X - 110, y: footerY + 28 }, end: { x: CENTER_X + 110, y: footerY + 28 }, thickness: 1, color: SLATE_LIGHT });
    centeredText(page, 'Authorized by Autoform India L&D', footerY + 14, 10, body, SLATE_LIGHT);
    centeredText(page, `Completed on ${dateStr}`, footerY - 8, 11, body, SLATE_LIGHT);

    centeredText(page, `Certificate No. ${certificateNumber}`, 55, 9, body, SLATE_LIGHT);
    centeredText(page, 'Verify this certificate in Autoform Connect using the certificate number above.', 40, 8, body, SLATE_LIGHT);

    return doc.save();
}

export async function issueCertificate(enrollmentId: number): Promise<void> {
    // NULL doesn't participate in SQL unique constraints, so the whole-course certificate's
    // uniqueness (one per enrollment) is enforced here via an explicit existence check rather
    // than relying on the (enrollmentId, moduleId) compound unique index.
    const existing = await prisma.certificate.findFirst({
        where: { enrollmentId, moduleId: null },
    });
    if (existing) return; // already issued, avoid duplicate (BRD §7.8)

    const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: { course: true, employee: { select: { name: true } } },
    });
    if (!enrollment) return;

    const certificateNumber = buildCertificateNumber(enrollment.courseId, enrollment.employeeId);
    const completedAt = enrollment.completedAt ?? new Date();

    const pdfBytes = await generateCertificatePdf({
        learnerName: enrollment.employee.name,
        courseTitle: enrollment.course.title,
        moduleTitle: null,
        certificateNumber,
        completedAt,
    });
    const pdfBase64 = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

    const expiresAt = enrollment.course.certificateValidityMonths
        ? new Date(completedAt.getFullYear(), completedAt.getMonth() + enrollment.course.certificateValidityMonths, completedAt.getDate())
        : null;

    await prisma.certificate.create({
        data: { enrollmentId, moduleId: null, certificateNumber, pdfBase64, expiresAt },
    });
}

/** Issues a per-module certificate. Only called when the course has certificatesPerModule
 * enabled (checked by the caller) — kept as a separate entry point from issueCertificate so the
 * whole-course flow (with its expiry/renewal semantics) stays untouched. */
export async function issueModuleCertificate(enrollmentId: number, moduleId: number): Promise<void> {
    const existing = await prisma.certificate.findUnique({
        where: { enrollmentId_moduleId: { enrollmentId, moduleId } },
    });
    if (existing) return;

    const [enrollment, module] = await Promise.all([
        prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: { course: { select: { title: true } }, employee: { select: { name: true } } },
        }),
        prisma.courseModule.findUnique({ where: { id: moduleId }, select: { title: true } }),
    ]);
    if (!enrollment || !module) return;

    const moduleProgress = await prisma.moduleProgress.findUnique({
        where: { enrollmentId_moduleId: { enrollmentId, moduleId } },
        select: { completedAt: true },
    });
    const completedAt = moduleProgress?.completedAt ?? new Date();

    const certificateNumber = buildCertificateNumber(enrollment.courseId, enrollment.employeeId, moduleId);

    const pdfBytes = await generateCertificatePdf({
        learnerName: enrollment.employee.name,
        courseTitle: enrollment.course.title,
        moduleTitle: module.title,
        certificateNumber,
        completedAt,
    });
    const pdfBase64 = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;

    await prisma.certificate.create({
        data: { enrollmentId, moduleId, certificateNumber, pdfBase64 },
    });
}
