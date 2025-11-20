import { createUser, getUserByEmail } from "@/models/User";
import { generateJWT } from "@/middleware/auth";
import connectToDB from "../../../lib/mongodb";

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  await connectToDB();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, authSalt, authHash, encryptedEncryptionKey, encryptedVault } = req.body;

  // 1. Validate presence
  if (!email || !authSalt || !authHash || !encryptedEncryptionKey || !encryptedVault) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // --- CRITICAL FIX: ROBUST SANITIZATION ---
  // This converts Arrays [1,2,3] or Objects {0:1, 1:2} into a Hex String "010203"
  const sanitize = (val) => {
    // 1. If it's already a string, return it (Base64 or Hex)
    if (typeof val === 'string') return val;

    // 2. If it's a standard Array [132, 3, 167...]
    if (Array.isArray(val)) {
      return Buffer.from(val).toString('hex');
    }

    // 3. If it's an Object-like Array { '0': 132, '1': 3... } (YOUR ERROR CASE)
    if (typeof val === 'object' && val !== null) {
      // Extract values back into an array
      const arr = Object.values(val);
      return Buffer.from(arr).toString('hex');
    }

    return val;
  };
  // -----------------------------------------

  try {
    // 2. Check existing user
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // 3. Sanitize inputs before Database interaction
    const finalSalt = sanitize(authSalt);
    const finalHash = sanitize(authHash);
    const finalEncKey = sanitize(encryptedEncryptionKey);
    const finalVault = sanitize(encryptedVault);

    // 4. Create user
    await createUser(email, finalSalt, finalHash, finalEncKey, finalVault);

    // 5. Generate Token
    const token = generateJWT(email, finalHash);

    return res.status(201).json({
      success: true,
      token,
      message: "User registered successfully",
    });

  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) { 
      return res.status(409).json({ error: "User already exists" });
    }
    // Handle Mongoose Validation Errors specifically
    if (error.name === 'ValidationError') {
       return res.status(400).json({ error: `Validation Error: ${error.message}` });
    }
    
    return res.status(500).json({ error: "Failed to register user" });
  }
}