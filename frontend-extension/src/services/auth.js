import { deriveMasterKey, generateAuthHash, generateEncryptionKey, generateAuthSalt } from "./crypto";
import api from "./api";

const STORAGE_KEYS = {
  TOKEN: "pm_token",
  SESSION_MASTER_KEY: "pm_session_key",
  SESSION_ENCRYPTION_KEY: "pm_session_enc_key",
};

// Registration flow
export async function register(email, masterPassword) {
  // Generate auth salt client-side
  const authSalt = new Uint8Array(generateAuthSalt());

  // Derive master key from password
  const masterKey = await deriveMasterKey(masterPassword, authSalt);

  // Generate auth hash for server verification
  const authHash = await generateAuthHash(masterKey);

  // Generate encryption key
  const encryptionKey = new Uint8Array(generateEncryptionKey());

  // Encrypt the encryption key using master key
  const encryptedEncryptionKey = await encryptEncryptionKey(encryptionKey, masterKey);

  // Create empty vault
  const vault = { passwords: [] };
  const { encryptVault } = await import("./crypto");
  const encryptedVault = await encryptVault(vault, encryptionKey);

  // Send to server
  const response = await api.post("/api/auth/register", {
    email,
    authSalt: Array.from(authSalt),
    authHash,
    encryptedEncryptionKey,
    encryptedVault,
  });

  // Store token and session keys
  if (response.token) {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_MASTER_KEY, Array.from(masterKey).join(","));
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ENCRYPTION_KEY, Array.from(encryptionKey).join(","));
  }

  return response;
}

// Login flow
export async function login(email, masterPassword) {
  // Get user data from server
  const loginResponse = await api.post("/api/auth/login", {
    email,
    authHash: "", // Placeholder, will be computed
  });

  // Actually, we need to compute authHash first
  const authSalt = new Uint8Array(loginResponse.authSalt);
  const masterKey = await deriveMasterKey(masterPassword, authSalt);
  const authHash = await generateAuthHash(masterKey);

  // Re-authenticate with computed hash
  const response = await api.post("/api/auth/login", {
    email,
    authHash,
  });

  if (response.token) {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_MASTER_KEY, Array.from(masterKey).join(","));
    
    // Decrypt encryption key
    const encryptionKey = await decryptEncryptionKey(
      response.encryptedEncryptionKey,
      masterKey
    );
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ENCRYPTION_KEY, Array.from(encryptionKey).join(","));
  }

  return response;
}

// Retrieve vault
export async function getVault() {
  const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  const encryptionKeyStr = sessionStorage.getItem(STORAGE_KEYS.SESSION_ENCRYPTION_KEY);
  
  if (!token || !encryptionKeyStr) {
    throw new Error("Not authenticated");
  }

  const encryptionKey = new Uint8Array(encryptionKeyStr.split(",").map(Number));

  const response = await api.get("/api/vault/get", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const { decryptVault } = await import("./crypto");
  const vault = await decryptVault(response.encryptedVault, encryptionKey);

  return vault;
}

// Update vault
export async function updateVault(vault) {
  const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
  const encryptionKeyStr = sessionStorage.getItem(STORAGE_KEYS.SESSION_ENCRYPTION_KEY);

  if (!token || !encryptionKeyStr) {
    throw new Error("Not authenticated");
  }

  const encryptionKey = new Uint8Array(encryptionKeyStr.split(",").map(Number));

  const { encryptVault } = await import("./crypto");
  const encryptedVault = await encryptVault(vault, encryptionKey);

  return api.post(
    "/api/vault/update",
    { encryptedVault },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// Encrypt encryption key with master key
async function encryptEncryptionKey(encryptionKey, masterKey) {
  // Use a simple AES-256-GCM encryption of the key
  const { encryptVault } = await import("./crypto");
  return encryptVault(
    { key: Array.from(encryptionKey) },
    masterKey
  );
}

// Decrypt encryption key with master key
async function decryptEncryptionKey(encryptedKeyB64, masterKey) {
  const { decryptVault } = await import("./crypto");
  const decrypted = await decryptVault(encryptedKeyB64, masterKey);
  return new Uint8Array(decrypted.key);
}

export function isAuthenticated() {
  return !!sessionStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function logout() {
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_MASTER_KEY);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_ENCRYPTION_KEY);
}