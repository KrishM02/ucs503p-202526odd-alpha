import { getUserByEmail } from "@/models/User";
import { generateJWT, verifyJWT } from "@/middleware/auth";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, authHash } = req.body;

  if (!email || !authHash) {
    return res.status(400).json({ error: "Email and authHash required" });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Constant-time comparison of hashes
    const hashBuffer1 = Buffer.from(user.authHash);
    const hashBuffer2 = Buffer.from(authHash);

    if (hashBuffer1.length !== hashBuffer2.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = crypto.timingSafeEqual(hashBuffer1, hashBuffer2);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateJWT(email);

    res.status(200).json({
      success: true,
      token,
      authSalt: user.authSalt,
      encryptedEncryptionKey: user.encryptedEncryptionKey,
      encryptedVault: user.encryptedVault,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
}