import crypto from 'crypto';
import { InternalError, UnauthorizedError } from './errors.js';
import { env } from '../config/env.js';

const CIPHER = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  if (!env.SALARY_ENCRYPTION_KEY) {
    throw new InternalError('Salary encryption key is not configured');
  }

  return crypto.createHash('sha256').update(env.SALARY_ENCRYPTION_KEY).digest();
}

export function verifySalaryApiKey(apiKey: string | undefined): void {
  if (!env.SALARY_API_KEY) {
    throw new InternalError('Salary API key is not configured');
  }

  if (!apiKey || apiKey !== env.SALARY_API_KEY) {
    throw new UnauthorizedError('Invalid salary API key');
  }
}

export function encryptSalaryValue(value: unknown): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(CIPHER, getKey(), iv);
  const payload = Buffer.from(JSON.stringify(value), 'utf8');

  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSalaryValue<T>(ciphertext: string): T {
  const raw = Buffer.from(ciphertext, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = raw.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(CIPHER, getKey(), iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted) as T;
}

