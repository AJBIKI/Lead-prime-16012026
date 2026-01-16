/**
 * Crypto Utilities - AES-256-GCM encryption for sensitive data
 * 
 * Used for encrypting OAuth tokens before storing in database.
 */

const crypto = require('crypto');

// Algorithm: AES-256-GCM (authenticated encryption)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Must be exactly 32 bytes for AES-256
 */
function getKey() {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error('ENCRYPTION_KEY not set in environment');
    }

    // Ensure key is exactly 32 bytes
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key).copy(keyBuffer);
    return keyBuffer;
}

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} plaintext - Text to encrypt
 * @returns {string} - Base64 encoded encrypted string (iv:authTag:ciphertext)
 */
function encrypt(plaintext) {
    if (!plaintext) return null;

    try {
        const key = getKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:ciphertext (all base64)
        return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error.message);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt a string using AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted string
 * @returns {string} - Decrypted plaintext
 */
function decrypt(encryptedData) {
    if (!encryptedData) return null;

    try {
        const key = getKey();
        const parts = encryptedData.split(':');

        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'base64');
        const authTag = Buffer.from(parts[1], 'base64');
        const ciphertext = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error.message);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Encrypt an object's specified fields
 * @param {Object} obj - Object with fields to encrypt
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {Object} - Object with encrypted fields
 */
function encryptFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
        if (result[field]) {
            result[field] = encrypt(result[field]);
        }
    }
    return result;
}

/**
 * Decrypt an object's specified fields
 * @param {Object} obj - Object with encrypted fields
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {Object} - Object with decrypted fields
 */
function decryptFields(obj, fields) {
    const result = { ...obj };
    for (const field of fields) {
        if (result[field]) {
            result[field] = decrypt(result[field]);
        }
    }
    return result;
}

/**
 * Generate a random encryption key (for setup)
 * @returns {string} - 32-character random key
 */
function generateKey() {
    return crypto.randomBytes(32).toString('base64').slice(0, 32);
}

module.exports = {
    encrypt,
    decrypt,
    encryptFields,
    decryptFields,
    generateKey
};
