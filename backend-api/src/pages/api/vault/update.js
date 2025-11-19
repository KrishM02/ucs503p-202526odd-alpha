import { updateUserVault } from "@/models/User";
import { verifyJWT } from "@/middleware/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

  const { encryptedVault } = req.body;

  if (!encryptedVault) {
    return res.status(400).json({ error: "encryptedVault required" });
  }

  try {
    const updated = await updateUserVault(decoded.email, encryptedVault);

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Vault updated successfully",
    });
  } catch (error) {
    console.error("Update vault error:", error);
    res.status(500).json({ error: "Failed to update vault" });
  }
}