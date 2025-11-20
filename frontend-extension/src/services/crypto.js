// utils/crypto.js

// ==========================================
// 1. Conversion Utilities
// ==========================================

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error("Base64 decode failed for:", base64);
    throw new Error("Invalid Base64 string encountered");
  }
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex) {
  if (!hex) return new Uint8Array(0).buffer;
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0).buffer;
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16))).buffer;
}

// --- CRITICAL FIX: Safe Key Normalizer ---
// This ensures 'importKey' always receives a Buffer, never a String
function normalizeKey(key) {
  if (!key) {
    throw new Error("Crypto Error: Key is missing (null or undefined)");
  }

  // If it's already an ArrayBuffer or TypedArray, return it
  if (key instanceof ArrayBuffer || ArrayBuffer.isView(key)) {
    return key;
  }

  // If it's a string, convert it
  if (typeof key === "string") {
    // Detect Hex (64 chars, 0-9 a-f)
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return hexToBuffer(key);
    }
    // Default to Base64
    return base64ToArrayBuffer(key);
  }

  throw new Error(`Crypto Error: Invalid key format. Expected Buffer or String, got ${typeof key}`);
}

// ==========================================
// 2. Key Derivation
// ==========================================

export async function deriveMasterKey(password, salt, iterations = 300000) {
  const saltBuffer = normalizeKey(salt); // Fix: Ensure salt is buffer
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
      salt: saltBuffer,
      iterations: iterations,
      hash: "SHA-256",
    },
    passwordKey,
    256
  );

  return arrayBufferToBase64(derivedBits);
}

export async function generateAuthHash(masterKeyBase64, staticString = "auth-verification") {
  const masterKey = normalizeKey(masterKeyBase64);
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

  return bufferToHex(hashBits);
}

// ==========================================
// 3. Encryption & Decryption
// ==========================================

export async function encryptVault(vault, encryptionKey) {
  if (!encryptionKey) throw new Error("No encryption key provided");

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // --- FIX IS HERE ---
  // Convert the string key to Buffer BEFORE importKey
  const keyBuffer = normalizeKey(encryptionKey);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Handle Object vs String inputs
  const stringData = typeof vault === 'object' ? JSON.stringify(vault) : String(vault);

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(stringData)
  );

  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return arrayBufferToBase64(combined);
}

export async function decryptVault(encryptedVaultB64, encryptionKey) {
  if (!encryptedVaultB64) return { passwords: [] }; // Return empty if null

  const combined = new Uint8Array(base64ToArrayBuffer(encryptedVaultB64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // --- FIX IS HERE ---
  const keyBuffer = normalizeKey(encryptionKey);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
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
  const decodedString = decoder.decode(decryptedData);
  
  try {
    return JSON.parse(decodedString);
  } catch (e) {
    return decodedString;
  }
}

// ==========================================
// 4. Generators
// ==========================================

export function generateEncryptionKey() {
  return arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(32)));
}

export function generateAuthSalt() {
  return arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)));
}