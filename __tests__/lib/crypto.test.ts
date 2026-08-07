import { describe, it, expect } from 'vitest';
import {
  generateKey,
  deriveKey,
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSalt,
} from '@/lib/crypto';

describe('Crypto Service', () => {
  describe('generateKey', () => {
    it('should generate a CryptoKey', async () => {
      const key = await generateKey();
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm).toBeDefined();
    });

    it('should generate unique keys', async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();
      // Keys are different objects (can't compare CryptoKey values directly)
      expect(key1).not.toBe(key2);
    });
  });

  describe('deriveKey', () => {
    it('should derive a key from passphrase + salt', async () => {
      const salt = generateSalt(16);
      const key = await deriveKey('test-passphrase', salt);
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
    });

    it('should derive consistent keys from same input', async () => {
      const salt = generateSalt(16);
      const key1 = await deriveKey('consistent', salt);
      const key2 = await deriveKey('consistent', salt);
      // Encrypt with key1, decrypt with key2 — should work
      const payload = await encrypt(key1, 'test data');
      const decrypted = await decrypt(key2, payload);
      expect(decrypted).toBe('test data');
    });

    it('should derive different keys from different passphrases', async () => {
      const salt = generateSalt(16);
      const key1 = await deriveKey('passphrase-one', salt);
      const key2 = await deriveKey('passphrase-two', salt);
      const payload = await encrypt(key1, 'secret');
      // Decrypting with wrong key should fail
      await expect(decrypt(key2, payload)).rejects.toThrow();
    });
  });

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt text', async () => {
      const key = await generateKey();
      const plaintext = 'Hello, World! 🔐';
      const payload = await encrypt(key, plaintext);
      const decrypted = await decrypt(key, payload);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext each time (random IV)', async () => {
      const key = await generateKey();
      const payload1 = await encrypt(key, 'same text');
      const payload2 = await encrypt(key, 'same text');
      expect(payload1.ciphertext).not.toBe(payload2.ciphertext);
      expect(payload1.iv).not.toBe(payload2.iv);
    });

    it('should handle empty strings', async () => {
      const key = await generateKey();
      const payload = await encrypt(key, '');
      const decrypted = await decrypt(key, payload);
      expect(decrypted).toBe('');
    });

    it('should handle long text', async () => {
      const key = await generateKey();
      const longText = 'A'.repeat(10_000);
      const payload = await encrypt(key, longText);
      const decrypted = await decrypt(key, payload);
      expect(decrypted).toBe(longText);
    });

    it('should return base64-encoded ciphertext and IV', async () => {
      const key = await generateKey();
      const payload = await encrypt(key, 'test');
      // Should be valid base64
      expect(() => atob(payload.ciphertext)).not.toThrow();
      expect(() => atob(payload.iv)).not.toThrow();
    });

    it('should fail to decrypt with wrong key', async () => {
      const key1 = await generateKey();
      const key2 = await generateKey();
      const payload = await encrypt(key1, 'secret');
      await expect(decrypt(key2, payload)).rejects.toThrow();
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('should hash a password', async () => {
      const result = await hashPassword('mypassword');
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.iterations).toBe(600_000);
      // Hash should be base64
      expect(() => atob(result.hash)).not.toThrow();
    });

    it('should verify correct password', async () => {
      const stored = await hashPassword('correct-password');
      const valid = await verifyPassword('correct-password', stored);
      expect(valid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const stored = await hashPassword('correct-password');
      const valid = await verifyPassword('wrong-password', stored);
      expect(valid).toBe(false);
    });

    it('should produce different hashes for same password (random salt)', async () => {
      const hash1 = await hashPassword('same-password');
      const hash2 = await hashPassword('same-password');
      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.salt).not.toBe(hash2.salt);
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of specified length', () => {
      const salt = generateSalt(16);
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt(32);
      const salt2 = generateSalt(32);
      expect(Array.from(salt1)).not.toEqual(Array.from(salt2));
    });
  });
});
