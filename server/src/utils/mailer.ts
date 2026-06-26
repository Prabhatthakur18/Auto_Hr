import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465,
            auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
        });
    }
    return transporter;
}

export function isSmtpConfigured(): boolean {
    return Boolean(env.SMTP_HOST && (env.SMTP_FROM || env.SMTP_USER));
}

export async function sendAnnouncementEmail(options: {
    recipients: string[];
    title: string;
    content?: string | null;
}): Promise<void> {
    if (!isSmtpConfigured()) {
        throw new Error('SMTP is not configured');
    }
    if (options.recipients.length === 0) {
        throw new Error('No eligible employee email addresses found');
    }

    const escapeHtml = (value: string) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const content = options.content?.trim() || 'A new company announcement has been published.';

    await getTransporter().sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to: env.SMTP_FROM || env.SMTP_USER,
        bcc: options.recipients,
        subject: options.title,
        text: `${options.title}\n\n${content}\n\nOpen Autoform Connect to view the announcement.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1e293b;">
                <h2 style="margin-bottom: 16px;">${escapeHtml(options.title)}</h2>
                <div style="line-height: 1.6; white-space: pre-wrap;">${escapeHtml(content)}</div>
                <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Open Autoform Connect to view the full announcement and any attachments.</p>
            </div>
        `,
    });
}

export async function sendLearningReminderEmail(options: {
    to: string;
    employeeName: string;
    courseTitle: string;
    dueDate: Date;
    kind: 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE';
}): Promise<void> {
    if (!isSmtpConfigured()) return;

    const escapeHtml = (value: string) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const dueDateStr = options.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const subject = options.kind === 'OVERDUE'
        ? `Overdue: "${options.courseTitle}" was due ${dueDateStr}`
        : options.kind === 'DUE_TODAY'
            ? `Due today: "${options.courseTitle}"`
            : `Reminder: "${options.courseTitle}" is due ${dueDateStr}`;
    const bodyLine = options.kind === 'OVERDUE'
        ? `This course was due on ${dueDateStr} and is still incomplete. Please finish it as soon as possible.`
        : options.kind === 'DUE_TODAY'
            ? `This course is due today, ${dueDateStr}.`
            : `This course is due on ${dueDateStr}. Please make sure to complete it on time.`;

    await getTransporter().sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to: options.to,
        subject,
        text: `Hi ${options.employeeName},\n\n${bodyLine}\n\nCourse: ${options.courseTitle}\n\nOpen Autoform Connect > Learning to continue.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1e293b;">
                <h2 style="margin-bottom: 16px; color: ${options.kind === 'OVERDUE' ? '#dc2626' : '#f46617'};">${escapeHtml(subject)}</h2>
                <p>Hi ${escapeHtml(options.employeeName)},</p>
                <p style="line-height: 1.6;">${escapeHtml(bodyLine)}</p>
                <p style="font-weight: 700; margin-top: 16px;">${escapeHtml(options.courseTitle)}</p>
                <p style="margin-top: 24px; color: #64748b; font-size: 13px;">Open Autoform Connect &gt; Learning to continue this course.</p>
            </div>
        `,
    });
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
    if (!env.SMTP_HOST) {
        console.warn(`⚠️  SMTP not configured — OTP for ${to} is ${otp} (dev only, not emailed)`);
        return;
    }

    await getTransporter().sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to,
        subject: 'Your Autoform Connect password reset code',
        text: `Your one-time password reset code is ${otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #f46617;">Password Reset Code</h2>
                <p>Use the code below to reset your Autoform Connect password. It expires in 10 minutes.</p>
                <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b;">${otp}</p>
                <p style="color: #64748b; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
            </div>
        `,
    });
}
