/**
 * AES-128-ECB crypto utilities for WeChat CDN upload/download.
 */
import { createCipheriv, createDecipheriv } from 'node:crypto';

export function encryptAesEcb(plaintext, key) {
  const cipher = createCipheriv('aes-128-ecb', key, null);
  return Buffer.concat([cipher.update(plaintext), cipher.final()]);
}

export function decryptAesEcb(ciphertext, key) {
  const decipher = createDecipheriv('aes-128-ecb', key, null);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/** PKCS7 padded size for AES-128-ECB */
export function aesEcbPaddedSize(plaintextSize) {
  return Math.ceil((plaintextSize + 1) / 16) * 16;
}

/**
 * Parse aes_key (base64) into raw 16-byte key.
 * Handles two encodings: base64(raw 16 bytes) or base64(hex string of 16 bytes).
 */
export function parseAesKey(aesKeyBase64) {
  const decoded = Buffer.from(aesKeyBase64, 'base64');
  if (decoded.length === 16) return decoded;
  if (decoded.length === 32 && /^[0-9a-fA-F]{32}$/.test(decoded.toString('ascii'))) {
    return Buffer.from(decoded.toString('ascii'), 'hex');
  }
  throw new Error(`Invalid aes_key: expected 16 raw bytes or 32-char hex, got ${decoded.length} bytes`);
}
