import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestError } from './errors.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');

async function ensureAvatarDir() {
    await mkdir(AVATAR_DIR, { recursive: true });
}

function extensionForMimeType(mimeType: string) {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
}

export async function storeAvatarFile(
    file: { mimetype: string; buffer: Buffer },
    prefix: string
) {
    if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestError('Avatar must be an image');
    }

    await ensureAvatarDir();

    const extension = extensionForMimeType(file.mimetype);
    const safePrefix = prefix.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const filename = `${safePrefix}-${randomUUID()}.${extension}`;
    const absolutePath = path.join(AVATAR_DIR, filename);

    await writeFile(absolutePath, file.buffer);

    return `/uploads/avatars/${filename}`;
}
