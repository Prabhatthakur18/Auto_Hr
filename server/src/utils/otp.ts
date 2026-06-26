import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const OTP_SALT_ROUNDS = 10;

export function generateOtp(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, OTP_SALT_ROUNDS);
}

export function verifyOtp(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
}
