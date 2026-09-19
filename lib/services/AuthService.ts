// =============================================================================
// AuthService — แปลงจาก auth.ts
// Password hashing/verification with scrypt
// =============================================================================

import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const PREFIX = 'scrypt';
const KEYLEN = 64;

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /** Hash a plaintext password with scrypt */
  hashPassword(plain: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plain, salt, KEYLEN).toString('hex');
    return `${PREFIX}$${salt}$${hash}`;
  }

  /** Check if a stored password is already hashed */
  isHashed(stored: string): boolean {
    return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
  }

  /** Verify a plaintext password against a stored hash or plaintext.
   *  Returns { ok, needsRehash }. Constant-time when comparing hashes. */
  verifyPassword(plain: string, stored: string): { ok: boolean; needsRehash: boolean } {
    if (!stored) return { ok: false, needsRehash: false };

    if (!this.isHashed(stored)) {
      // Legacy / bootstrap plaintext value
      return { ok: plain === stored, needsRehash: plain === stored };
    }

    const [, salt, hashHex] = stored.split('$');
    if (!salt || !hashHex) return { ok: false, needsRehash: false };

    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(plain, salt, expected.length);
    const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
    return { ok, needsRehash: false };
  }
}

// Backward-compatible named exports for existing code that imports from auth.ts
const _instance = AuthService.getInstance();
export const hashPassword = _instance.hashPassword.bind(_instance);
export const verifyPassword = _instance.verifyPassword.bind(_instance);
export const isHashed = _instance.isHashed.bind(_instance);
