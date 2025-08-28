import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Derives a key from the master encryption key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The plain text to encrypt
 * @param masterKey - The master encryption key
 * @returns Encrypted string in base64 format
 */
export function encrypt(text: string, masterKey: string): string {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key from master key
    const key = deriveKey(masterKey, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    // Get the auth tag
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    
    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a string encrypted with AES-256-GCM
 * @param encryptedText - The encrypted text in base64 format
 * @param masterKey - The master encryption key
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string, masterKey: string): string {
  try {
    // Convert from base64
    const combined = Buffer.from(encryptedText, 'base64');
    
    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
    const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = combined.slice(ENCRYPTED_POSITION);
    
    // Derive key from master key
    const key = deriveKey(masterKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Masks an API key for display (shows first 7 and last 4 characters)
 * @param apiKey - The full API key
 * @returns Masked key like "sk-proj...4a3b"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 15) {
    return '***';
  }
  
  const firstPart = apiKey.substring(0, 7);
  const lastPart = apiKey.substring(apiKey.length - 4);
  
  return `${firstPart}...${lastPart}`;
}

/**
 * Generates a secure random encryption key
 * @returns 32-byte key as hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates that an encryption key is properly formatted
 * @param key - The encryption key to validate
 * @returns true if valid, false otherwise
 */
export function validateEncryptionKey(key: string): boolean {
  if (!key) return false;
  
  // Should be 64 hex characters (32 bytes)
  const hexRegex = /^[0-9a-f]{64}$/i;
  return hexRegex.test(key);
}

/**
 * Checks if a string is already encrypted (base64 with expected length)
 * @param text - The text to check
 * @returns true if likely encrypted, false otherwise
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  
  try {
    const decoded = Buffer.from(text, 'base64');
    // Encrypted data should have at least salt + iv + tag + some data
    return decoded.length >= (SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1);
  } catch {
    return false;
  }
}

// Export the master key getter with validation
export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY not found in environment variables. ' +
      'Please add ENCRYPTION_KEY to your .env file. ' +
      'You can generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  if (!validateEncryptionKey(key)) {
    throw new Error(
      'ENCRYPTION_KEY is invalid. It should be a 64-character hex string. ' +
      'Generate a new one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  return key;
}