import { randomUUID } from 'node:crypto';
import { BadRequestError } from './errors.js';
import { putUploadFile } from './uploadStorage.js';

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

    const extension = extensionForMimeType(file.mimetype);
    const safePrefix = prefix.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const filename = `${safePrefix}-${randomUUID()}.${extension}`;

    return putUploadFile(`avatars/${filename}`, file.buffer);
}
