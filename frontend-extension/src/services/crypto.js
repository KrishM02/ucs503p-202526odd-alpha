// Utility to convert between base64 and ArrayBuffer
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate random bytes
function generateRandomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

// PBKDF2 key derivation
export async function deriveMasterKey(password, salt, iterations = 300000) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    passwordKey,
    256
  );

  return new Uint8Array(derivedBits);
}

// Generate auth hash (used for server-side verification)
export async function generateAuthHash(masterKey, staticString = "auth-verification") {
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw",
    masterKey,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const hashBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(staticString),
      iterations: 1,
      hash: "SHA-256",
    },
    keyData,
    256
  );

  return arrayBufferToBase64(hashBits);
}

// AES-256-GCM encryption
export async function encryptVault(vault, encryptionKey) {
  const encoder = new TextEncoder();
  const iv = generateRandomBytes(12);
  
  const key = await crypto.subtle.importKey(
    "raw",
    encryptionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const vaultJsonString = JSON.stringify(vault);
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(vaultJsonString)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return arrayBufferToBase64(combined);
}

// AES-256-GCM decryption
export async function decryptVault(encryptedVaultB64, encryptionKey) {
  const combined = new Uint8Array(base64ToArrayBuffer(encryptedVaultB64));
  
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const key = await crypto.subtle.importKey(
    "raw",
    encryptionKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedData));
}

// Generate random encryption key
export function generateEncryptionKey() {
  return generateRandomBytes(32); // 256-bit key for AES-256
}

// Generate random salt
export function generateAuthSalt() {
  return generateRandomBytes(16); // 128-bit salt
}