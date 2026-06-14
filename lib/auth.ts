import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

// Password storage for the Sheets-backed Users table.
//
// Hashed form: "scrypt$<saltHex>$<hashHex>". We still accept plaintext values in
// the sheet so an admin can bootstrap a user by typing a password directly; such
// rows are flagged via `needsRehash` so the login route can transparently upgrade
// them to a hash on first successful sign-in.

const PREFIX = 'scrypt';
const KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, KEYLEN).toString('hex');
  return `${PREFIX}$${salt}$${hash}`;
}

export function isHashed(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
}

/** Returns { ok, needsRehash }. Constant-time when comparing hashes. */
export function verifyPassword(plain: string, stored: string): { ok: boolean; needsRehash: boolean } {
  if (!stored) return { ok: false, needsRehash: false };

  if (!isHashed(stored)) {
    // Legacy / bootstrap plaintext value.
    return { ok: plain === stored, needsRehash: plain === stored };
  }

  const [, salt, hashHex] = stored.split('$');
  if (!salt || !hashHex) return { ok: false, needsRehash: false };

  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(plain, salt, expected.length);
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
  return { ok, needsRehash: false };
}
