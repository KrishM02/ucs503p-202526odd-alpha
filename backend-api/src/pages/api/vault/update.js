import { verifyJWT } from "@/middleware/auth";
import connectToDB from "../../../lib/mongodb";
import users from "../../../models/Schema";


export default async function handler(req, res) {
  // 1. Handle CORS/Methods immediately
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 2. Verify Auth using the REQUEST object (not the token string)
    // This will verify the token AND inject req.body.authHash and req.body.userEmail
    const decoded = verifyJWT(req);

    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized: Invalid Token" });
    }

    // 3. Connect to DB
    await connectToDB();

    // 4. Extract Data
    // userEmail was injected by verifyJWT
    const { encryptedVault, userEmail } = req.body; 

    if (!encryptedVault) {
      return res.status(400).json({ error: "Missing encryptedVault data" });
    }

    console.log(`Updating vault for: ${userEmail}`);

    // 5. Update Database (Example using direct Mongoose model or helper)
    // You might need to import your User model directly if you don't have a helper
     
    
    const result = await users.findOneAndUpdate(
      { email: userEmail },
      { 
        encryptedVault: encryptedVault,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Vault Update Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}