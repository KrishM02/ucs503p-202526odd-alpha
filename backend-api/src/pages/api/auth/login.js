import { getUserByEmail } from "@/models/User";
import { generateJWT } from "@/middleware/auth";
import crypto from "crypto";
import connectToDB from "../../../lib/mongodb";

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  await connectToDB();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Parse Body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      console.error(error);
      return res.status(400).json({ error: "Invalid JSON format" });
    }
  }

  const { email, authHash } = body || {};

  if (!email || !authHash) {
    return res.status(400).json({ error: "Email and authHash required" });
  }

  try {
    const user = await getUserByEmail(email);
    
    // Security: If user doesn't exist, return 401 (or 404 depending on privacy preference)
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // --- FIX START: Handle Pre-Login Salt Retrieval ---
    // The frontend sends "FETCH_SALT" to get the salt before computing the real hash.
    if (authHash === "FETCH_SALT") {
      return res.status(200).json({
        success: true,
        authSalt: user.authSalt // Send salt back so frontend can hash the password
      });
    }
    // --- FIX END ---

    // 2. Standard Login (Password Verification)
    const storedHashBuffer = Buffer.from(user.authHash, 'hex');
    
    let inputHashBuffer;
    try {
        // Handle case where frontend sends Hex string vs Array
        if (Array.isArray(authHash)) {
            inputHashBuffer = Buffer.from(authHash);
        } else {
            inputHashBuffer = Buffer.from(authHash, 'hex');
        }
    } catch (e) {
        return res.status(400).json({ error: "Invalid hash format" });
    }

    // Length check prevents timing attacks on length
    if (storedHashBuffer.length !== inputHashBuffer.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Timing safe compare
    const isMatch = crypto.timingSafeEqual(storedHashBuffer, inputHashBuffer);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Generate Token (Pass authHash to support verifyJWT middleware)
    const token = generateJWT(email, user.authHash);

    return res.status(200).json({
      success: true,
      token,
      // Return keys so frontend can decrypt vault
      encryptedEncryptionKey: user.encryptedEncryptionKey,
      encryptedVault: user.encryptedVault,
    });

  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Failed to login" });
  }
}