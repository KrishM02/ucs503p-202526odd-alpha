import { createUser, getUserByEmail } from "@/models/User";
import { generateJWT } from "@/middleware/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, authSalt, authHash, encryptedEncryptionKey, encryptedVault } = req.body;

  if (!email || !authSalt || !authHash || !encryptedEncryptionKey || !encryptedVault) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Create user
    await createUser(email, authSalt, authHash, encryptedEncryptionKey, encryptedVault);

    // Generate JWT token
    const token = generateJWT(email);

    res.status(201).json({
      success: true,
      token,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
}