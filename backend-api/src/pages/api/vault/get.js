import { getUserByEmail } from "@/models/User";
import { verifyJWT } from "@/middleware/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const user = await getUserByEmail(decoded.email);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      success: true,
      encryptedVault: user.encryptedVault,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Get vault error:", error);
    res.status(500).json({ error: "Failed to get vault" });
  }
}