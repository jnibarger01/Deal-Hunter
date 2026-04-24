import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import config from '../config/env';
import { AppError } from '../middleware/errorHandler';

const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  if (!config.operatorSecretKey) {
    throw new AppError('Operator secret storage is not configured', 503);
  }

  return createHash('sha256').update(config.operatorSecretKey).digest();
};

export function encryptOperatorSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptOperatorSecret(payload: string): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
