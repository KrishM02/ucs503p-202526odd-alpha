// services/auth.js
import { 
  deriveMasterKey, 
  generateAuthHash, 
  generateEncryptionKey, 
  generateAuthSalt, 
  encryptVault, 
  decryptVault 
} from "./crypto.js"; // Ensure this path is correct relative to your file structure

// We use a simple fetch wrapper or axios. 
// If you don't have a default 'api' export, use standard fetch inside.
// For this example, I will use standard fetch to be safe and explicit.

const API_BASE = "http://localhost:3000/api";

// ==========================================
// 1. REGISTRATION
// ==========================================
export async function register(email, password) {
  // 1. Generate new random salt (Base64)
  const authSalt = generateAuthSalt();

  // 2. Derive Master Key (Base64)
  // This is never sent to server. Used only to encrypt/decrypt the random key.
  const masterKey = await deriveMasterKey(password, authSalt);

  // 3. Generate Auth Hash (Hex)
  // This is sent to server for login verification.
  const authHash = await generateAuthHash(masterKey);

  // 4. Generate Random Encryption Key (Base64)
  // This is the actual key used to encrypt the vault data.
  const encryptionKey = generateEncryptionKey();

  // 5. Encrypt the Encryption Key
  // We wrap it in an object or encrypt string directly. 
  // We encrypt it using the Master Key so only the user can recover it.
  const encryptedEncryptionKey = await encryptVault(encryptionKey, masterKey);

  // 6. Create & Encrypt Initial Empty Vault
  const initialVault = { passwords: [] };
  const encryptedVault = await encryptVault(initialVault, encryptionKey);

  // 7. Send to Backend
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      authSalt,             // Base64
      authHash,             // Hex
      encryptedEncryptionKey, // Base64
      encryptedVault        // Base64
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }

  // 8. Return Token and Key (for Auth.jsx to save)
  return {
    token: data.token,
    encryptionKey: encryptionKey // Return the RAW key so we can use it immediately
  };
}

// ==========================================
// 2. LOGIN
// ==========================================
export async function login(email, password) {
  // STEP 1: Get the User's Salt
  // We cannot hash the password without the user's unique salt.
  // NOTE: You might need a specific endpoint for this, or use a 'pre-login' check.
  // Here, I assume POST /api/auth/salt exists OR your login endpoint handles this.
  
  // If you don't have a specific 'get-salt' endpoint, you can try hitting 
  // login with a dummy hash, and have your backend return the salt on 401.
  // BUT, for cleaner code, let's assume we can get the user info first.
  
  // Workaround if you haven't made a new endpoint:
  // We try to login with empty hash. If backend is smart, it returns salt.
  let authSalt;
  
  const saltResponse = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, authHash: "FETCH_SALT" }), 
  });

  const saltData = await saltResponse.json();

  if (saltData.authSalt) {
    authSalt = saltData.authSalt;
  } else {
    // If the backend didn't give us the salt, we can't log in.
    // You need to ensure your backend sends { authSalt } even on failure if email exists,
    // OR create a dedicated route: router.post('/get-salt', ...)
    throw new Error("Could not retrieve login parameters. User may not exist.");
  }

  // STEP 2: Derive Keys
  const masterKey = await deriveMasterKey(password, authSalt);
  const authHash = await generateAuthHash(masterKey);

  // STEP 3: Real Login
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, authHash }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  // STEP 4: Decrypt the stored Encryption Key
  // The server sends back 'encryptedEncryptionKey'
  if (!data.encryptedEncryptionKey) {
    throw new Error("Server did not return encryption key bundle.");
  }

  const decryptedEncryptionKey = await decryptVault(
    data.encryptedEncryptionKey,
    masterKey
  );

  // If we wrapped it in an object { key: '...' }, extract it. 
  // If we encrypted the string directly, it's already the string.
  // Based on 'register' function above, we encrypted the string directly.
  
  // However, decryptVault usually parses JSON. 
  // If decryptVault returns a string, use it. If it returns null/error, throw.
  if (!decryptedEncryptionKey) {
    throw new Error("Failed to decrypt your vault key. Wrong password?");
  }

  return {
    token: data.token,
    encryptionKey: decryptedEncryptionKey
  };
}

// ==========================================
// 3. VAULT OPERATIONS
// ==========================================

export async function getVault() {
  const token = localStorage.getItem("token");
  const encryptionKey = localStorage.getItem("encryptionKey");

  if (!token || !encryptionKey) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE}/vault/get`, {
    method: "GET",
    headers: { 
      "Authorization": `Bearer ${token}` 
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to fetch vault");

  // Decrypt
  const vault = await decryptVault(data.encryptedVault, encryptionKey);
  return vault || { passwords: [] };
}

export const updateVault = async (vaultData) => {
  const token = localStorage.getItem("token");

  // Note: vaultData here should contain { encryptedVault: "..." }
  // It is prepared by AddPassword.jsx
  
  const res = await fetch(`${API_BASE}/vault/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(vaultData)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update vault");
  }
  
  return res.json();
};

// ==========================================
// 4. UTILS
// ==========================================

export function isAuthenticated() {
  // Simple check if token exists
  return !!localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("encryptionKey");
  // Optional: Reload page
  window.location.reload(); 
}