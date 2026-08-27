import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PiiCryptoService {
  constructor(private readonly config: ConfigService) {}

  private key(): Buffer | null {
    const raw = this.config.get<string>('DOCUMENT_ENCRYPTION_KEY')?.trim();
    if (!raw) return null;
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    try {
      const b = Buffer.from(raw, 'base64');
      if (b.length === 32) return b;
    } catch {
      /* fall through */
    }
    return scryptSync(raw, 'tutorconnect-pii', 32);
  }

  encrypt(plaintext: string): { ciphertext: string; last4: string } | null {
    const key = this.key();
    if (!key) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, tag, enc]).toString('base64');
    const digits = plaintext.replace(/\s+/g, '');
    const last4 = digits.slice(-4);
    return { ciphertext: packed, last4 };
  }

  decrypt(ciphertext: string): string | null {
    const key = this.key();
    if (!key) return null;
    try {
      const buf = Buffer.from(ciphertext, 'base64');
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const data = buf.subarray(28);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(data),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return null;
    }
  }

  maskLast4(last4?: string | null): string {
    if (!last4) return '****';
    return `****${last4}`;
  }
}
