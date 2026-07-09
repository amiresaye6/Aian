import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * AES-256-GCM Encryption Service.
 *
 * Used by all provider modules to encrypt/decrypt OAuth tokens
 * before storing them in the database.
 *
 * Requires `ENCRYPTION_KEY` in `.env` — a 64-character hex string (32 bytes).
 *
 * Usage:
 * ```ts
 * const encrypted = encryptionService.encrypt(accessToken);
 * const decrypted = encryptionService.decrypt(encrypted);
 * ```
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  /**
   * Encrypt a plaintext string.
   * Returns a combined string: `iv:authTag:ciphertext` (all hex-encoded).
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a previously encrypted string.
   * Expects the format: `iv:authTag:ciphertext` (all hex-encoded).
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected iv:authTag:ciphertext');
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
