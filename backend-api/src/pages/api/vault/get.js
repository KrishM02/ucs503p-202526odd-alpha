import { getUserByEmail } from "@/models/User";
import { verifyToken } from "@/middleware/auth"; // <--- IMPORT verifyToken (not verifyJWT)
import connectToDB from "../../../lib/mongodb";

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  await connectToDB();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- FIX 1: Robust Token Extraction ---
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Handle both "Bearer <token>" and just "<token>"
    token = authHeader.startsWith("Bearer ") 
      ? authHeader.split(" ")[1] 
      : authHeader;
  } else if (req.cookies.jwtoken) {
    // Fallback to cookie
    token = req.cookies.jwtoken;
  }

  // Debug: Check if secret exists (Don't log the actual secret!)
  if (!process.env.JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET is missing in .env");
    return res.status(500).json({ error: "Server configuration error" });
  }

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  // --- FIX 2: Use the String Verifier ---
  const decoded = verifyToken(token);

  if (!decoded || !decoded.email) {
    console.log("Token verification failed for token:", token.substring(0, 10) + "...");
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const user = await getUserByEmail(decoded.email);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      success: true,
      encryptedVault: user.encryptedVault,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Get vault error:", error.message);
    return res.status(500).json({ error: "Failed to get vault" });
  }
}